import pytest
from pydantic import ValidationError

from careerboost_api.domain import (
    RecommendationEvidence,
    RecommendationItem,
    RecommendationsContract,
    RecommendationSourceMetadata,
)


def create_recommendation_item(
    *,
    category: str = "resume_structure",
    priority: str = "high",
) -> RecommendationItem:
    return RecommendationItem(
        identifier="missing-skills-section",
        category=category,
        title="Make the skills section easier to identify",
        description=(
            "The deterministic section detector did not identify an expected skills section."
        ),
        priority=priority,
        evidence=[
            RecommendationEvidence(
                source_type="missing_expected_section",
                source_id="section:skills",
                summary="The skills section is missing from the completeness baseline.",
            )
        ],
        source_metadata=RecommendationSourceMetadata(
            pipeline_stage="completeness",
            signal="missing_section:skills",
        ),
        actionable_next_step="Consider adding a clearly labeled Skills section.",
        boundary_note="This guidance is based only on deterministic section metadata.",
    )


def test_recommendations_contract_accepts_valid_ready_state() -> None:
    contract = RecommendationsContract(
        status="recommendations_ready",
        items=[create_recommendation_item()],
    )

    assert contract.status == "recommendations_ready"
    assert contract.source == "deterministic_analysis_metadata"
    assert contract.items[0].category == "resume_structure"
    assert contract.items[0].priority == "high"


@pytest.mark.parametrize(
    "status",
    ["recommendations_ready", "no_recommendations", "insufficient_data", "not_evaluated"],
)
def test_recommendations_contract_supports_all_status_states(status: str) -> None:
    items = [create_recommendation_item()] if status == "recommendations_ready" else []

    contract = RecommendationsContract(status=status, items=items)

    assert contract.status == status


@pytest.mark.parametrize(
    "category",
    [
        "resume_structure",
        "resume_content",
        "ats_compatibility",
        "skill_visibility",
        "role_signal_gap",
        "document_quality",
    ],
)
def test_recommendation_item_supports_all_allowed_categories(category: str) -> None:
    item = create_recommendation_item(category=category)

    assert item.category == category


def test_recommendation_item_rejects_unsupported_category() -> None:
    with pytest.raises(ValidationError):
        create_recommendation_item(category="job_market_trend")


@pytest.mark.parametrize("priority", ["high", "medium", "low"])
def test_recommendation_item_supports_priority_vocabulary(priority: str) -> None:
    item = create_recommendation_item(priority=priority)

    assert item.priority == priority


def test_recommendation_item_rejects_invalid_priority() -> None:
    with pytest.raises(ValidationError):
        create_recommendation_item(priority="urgent")


def test_recommendation_item_requires_evidence() -> None:
    with pytest.raises(ValidationError):
        RecommendationItem(
            identifier="missing-skills-section",
            category="resume_structure",
            title="Make the skills section easier to identify",
            description="The deterministic section detector did not identify a skills section.",
            priority="high",
            evidence=[],
            source_metadata=RecommendationSourceMetadata(
                pipeline_stage="completeness",
                signal="missing_section:skills",
            ),
            actionable_next_step="Consider adding a clearly labeled Skills section.",
        )


@pytest.mark.parametrize(
    "source_type",
    [
        "missing_expected_section",
        "detected_section_structure",
        "deterministic_ats_issue",
        "explicit_skill_signal",
        "missing_role_signal",
        "extraction_quality_metadata",
        "target_alignment_metadata",
    ],
)
def test_recommendation_evidence_supports_allowed_source_types(source_type: str) -> None:
    evidence = RecommendationEvidence(
        source_type=source_type,
        source_id=f"source:{source_type}",
        summary="A deterministic signal supports this guidance item.",
    )

    assert evidence.source_type == source_type


def test_recommendation_item_rejects_missing_actionable_step() -> None:
    with pytest.raises(ValidationError):
        RecommendationItem(
            identifier="missing-skills-section",
            category="resume_structure",
            title="Make the skills section easier to identify",
            description="The deterministic section detector did not identify a skills section.",
            priority="high",
            evidence=[
                RecommendationEvidence(
                    source_type="missing_expected_section",
                    source_id="section:skills",
                    summary="The skills section is missing from the completeness baseline.",
                )
            ],
            source_metadata=RecommendationSourceMetadata(
                pipeline_stage="completeness",
                signal="missing_section:skills",
            ),
            actionable_next_step=" ",
        )


def test_recommendation_contract_rejects_extra_fields() -> None:
    with pytest.raises(ValidationError):
        RecommendationItem(
            identifier="missing-skills-section",
            category="resume_structure",
            title="Make the skills section easier to identify",
            description="The deterministic section detector did not identify a skills section.",
            priority="high",
            evidence=[
                RecommendationEvidence(
                    source_type="missing_expected_section",
                    source_id="section:skills",
                    summary="The skills section is missing from the completeness baseline.",
                )
            ],
            source_metadata=RecommendationSourceMetadata(
                pipeline_stage="completeness",
                signal="missing_section:skills",
            ),
            actionable_next_step="Consider adding a clearly labeled Skills section.",
            confidence_score=0.98,
        )


def test_recommendations_contract_rejects_ready_state_without_items() -> None:
    with pytest.raises(ValidationError):
        RecommendationsContract(status="recommendations_ready")


@pytest.mark.parametrize("status", ["no_recommendations", "insufficient_data", "not_evaluated"])
def test_recommendations_contract_rejects_fallback_states_with_items(status: str) -> None:
    with pytest.raises(ValidationError):
        RecommendationsContract(status=status, items=[create_recommendation_item()])


def test_recommendations_contract_represents_insufficient_data_state() -> None:
    contract = RecommendationsContract(status="insufficient_data")

    assert contract.items == []


def test_recommendations_contract_represents_no_recommendations_state() -> None:
    contract = RecommendationsContract(status="no_recommendations")

    assert contract.items == []


def test_recommendation_item_rejects_unsupported_outcome_claims() -> None:
    with pytest.raises(ValidationError):
        RecommendationItem(
            identifier="unsupported-claim",
            category="ats_compatibility",
            title="Guaranteed ATS improvement",
            description="This will pass ATS checks.",
            priority="high",
            evidence=[
                RecommendationEvidence(
                    source_type="deterministic_ats_issue",
                    source_id="ats:formatting",
                    summary="A deterministic formatting issue was detected.",
                )
            ],
            source_metadata=RecommendationSourceMetadata(
                pipeline_stage="ats_feedback",
                signal="formatting_risk",
            ),
            actionable_next_step="Review this formatting issue.",
        )
