from careerboost_api.domain import (
    AnalysisError,
    AtsFeedbackContract,
    DetectedResumeSection,
    ResumeCompletenessContract,
    ResumeExtractionContract,
    ResumeSectionName,
)
from careerboost_api.services.ats_feedback import AtsFeedbackService


def build_section(
    name: ResumeSectionName,
    *,
    content: str = "Section content",
) -> DetectedResumeSection:
    return DetectedResumeSection(
        name=name,
        heading=name.title(),
        start_line=1,
        end_line=3,
        content=content,
    )


def build_extraction(
    *,
    confidence: str = "high",
    character_count: int = 900,
    sections: list[DetectedResumeSection] | None = None,
) -> ResumeExtractionContract:
    extracted_text = "Resume text " * 80

    return ResumeExtractionContract(
        status="extracted",
        confidence=confidence,
        character_count=character_count,
        page_count=1,
        extracted_text=extracted_text,
        normalized_text=extracted_text.strip(),
        sections=sections if sections is not None else [],
    )


def build_completeness(
    *,
    present_sections: list[ResumeSectionName],
    missing_sections: list[ResumeSectionName],
) -> ResumeCompletenessContract:
    return ResumeCompletenessContract(
        expected_sections=["summary", "skills", "experience", "education", "projects"],
        present_sections=present_sections,
        missing_sections=missing_sections,
        score=len(present_sections) / 5,
    )


def test_ats_feedback_service_generates_deterministic_non_scored_issues() -> None:
    service = AtsFeedbackService()
    extraction = build_extraction(
        confidence="medium",
        character_count=420,
        sections=[
            build_section("summary", content=""),
            build_section("skills", content="Python, TypeScript"),
        ],
    )
    completeness = build_completeness(
        present_sections=["summary", "skills"],
        missing_sections=["experience", "education", "projects"],
    )

    result = service.generate(extraction=extraction, completeness=completeness)

    assert isinstance(result, AtsFeedbackContract)
    assert result.status == "metadata_ready"
    assert result.score.status == "not_scored"
    assert result.score.score is None
    assert result.keyword_coverage.status == "not_evaluated"
    assert [issue.category for issue in result.issues] == [
        "section_presence",
        "section_presence",
        "section_presence",
        "section_structure",
        "formatting_risk",
        "readability_structure",
        "keyword_coverage_placeholder",
    ]
    assert [issue.observed_signal for issue in result.issues] == [
        "missing_section:experience",
        "missing_section:education",
        "missing_section:projects",
        "section_content_empty:summary",
        "character_count:<600",
        "extraction_confidence:medium",
        "keyword_coverage:not_evaluated",
    ]


def test_ats_feedback_service_returns_not_evaluated_for_insufficient_data() -> None:
    service = AtsFeedbackService()
    failed_extraction = ResumeExtractionContract(
        status="failed",
        error=AnalysisError(
            category="low_text",
            message="Resume text is too short to analyze. Upload a text-based PDF resume.",
        ),
    )

    result = service.generate(extraction=failed_extraction, completeness=None)

    assert result.status == "not_evaluated"
    assert result.score.status == "not_scored"
    assert result.score.score is None
    assert result.keyword_coverage.status == "not_evaluated"
    assert len(result.issues) == 1
    assert result.issues[0].category == "readability_structure"
    assert result.issues[0].observed_signal == "ats_feedback:insufficient_data"


def test_ats_feedback_service_does_not_invent_issues_for_complete_metadata() -> None:
    service = AtsFeedbackService()
    extraction = build_extraction(
        confidence="high",
        character_count=900,
        sections=[
            build_section("summary"),
            build_section("skills"),
            build_section("experience"),
            build_section("education"),
            build_section("projects"),
        ],
    )
    completeness = build_completeness(
        present_sections=["summary", "skills", "experience", "education", "projects"],
        missing_sections=[],
    )

    result = service.generate(extraction=extraction, completeness=completeness)

    assert result.status == "metadata_ready"
    assert [issue.category for issue in result.issues] == ["keyword_coverage_placeholder"]
    assert result.issues[0].observed_signal == "keyword_coverage:not_evaluated"
    assert result.score.score is None


def test_ats_feedback_service_reports_absent_section_structure_safely() -> None:
    service = AtsFeedbackService()
    extraction = build_extraction(sections=[])
    completeness = build_completeness(
        present_sections=[],
        missing_sections=["summary", "skills", "experience", "education", "projects"],
    )

    result = service.generate(extraction=extraction, completeness=completeness)

    assert result.status == "metadata_ready"
    assert "section_count:0" in [issue.observed_signal for issue in result.issues]
    assert result.score.score is None
