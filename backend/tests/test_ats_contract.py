import pytest
from pydantic import ValidationError

from careerboost_api.domain import (
    AtsFeedbackContract,
    AtsFeedbackIssue,
    AtsKeywordCoveragePlaceholder,
    AtsScorePlaceholder,
)


def test_ats_feedback_contract_represents_deterministic_metadata() -> None:
    contract = AtsFeedbackContract(
        issues=[
            AtsFeedbackIssue(
                category="section_presence",
                severity="warning",
                title="Expected section not detected",
                description="The education section was not detected by deterministic headings.",
                observed_signal="missing_section:education",
                related_sections=["education"],
            ),
            AtsFeedbackIssue(
                category="section_structure",
                severity="info",
                title="Detected section order",
                description="Projects were detected after skills in the extracted text.",
                observed_signal="section_order:skills->projects",
                related_sections=["skills", "projects"],
            ),
            AtsFeedbackIssue(
                category="formatting_risk",
                severity="warning",
                title="Low extracted text volume",
                description=(
                    "The extracted text length is below the future formatting review target."
                ),
                observed_signal="character_count:<600",
            ),
            AtsFeedbackIssue(
                category="keyword_coverage_placeholder",
                severity="info",
                title="Keyword coverage not evaluated",
                description="Keyword coverage requires a future role-specific keyword source.",
                observed_signal="keyword_coverage:not_evaluated",
            ),
            AtsFeedbackIssue(
                category="readability_structure",
                severity="info",
                title="Readable text extracted",
                description="The resume has readable text available for future structure checks.",
                observed_signal="extraction_status:extracted",
            ),
        ]
    )

    assert contract.status == "metadata_ready"
    assert contract.source == "deterministic_resume_signals"
    assert [issue.category for issue in contract.issues] == [
        "section_presence",
        "section_structure",
        "formatting_risk",
        "keyword_coverage_placeholder",
        "readability_structure",
    ]
    assert contract.keyword_coverage.status == "not_evaluated"
    assert contract.keyword_coverage.matched_keywords == []
    assert contract.keyword_coverage.missing_keywords == []
    assert contract.score.status == "not_scored"
    assert contract.score.score is None


def test_ats_feedback_issue_rejects_empty_observed_signal() -> None:
    with pytest.raises(ValidationError):
        AtsFeedbackIssue(
            category="formatting_risk",
            severity="warning",
            title="Formatting signal",
            description="A deterministic formatting signal was detected.",
            observed_signal=" ",
        )


def test_ats_contract_forbids_score_values() -> None:
    with pytest.raises(ValidationError):
        AtsScorePlaceholder(score=87)


def test_ats_contract_forbids_keyword_results_before_evaluation() -> None:
    with pytest.raises(ValidationError):
        AtsKeywordCoveragePlaceholder(
            matched_keywords=["python"],
            missing_keywords=[],
        )


def test_ats_contract_rejects_extra_fields() -> None:
    with pytest.raises(ValidationError):
        AtsFeedbackContract(readiness_label="ready")
