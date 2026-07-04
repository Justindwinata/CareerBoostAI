"""Deterministic improvement guidance contracts for future recommendation workflows."""

from typing import Literal, Self

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

RecommendationStatus = Literal[
    "recommendations_ready",
    "no_recommendations",
    "insufficient_data",
    "not_evaluated",
]
RecommendationCategory = Literal[
    "resume_structure",
    "resume_content",
    "ats_compatibility",
    "skill_visibility",
    "role_signal_gap",
    "document_quality",
]
RecommendationPriority = Literal["high", "medium", "low"]
RecommendationEvidenceSourceType = Literal[
    "missing_expected_section",
    "detected_section_structure",
    "deterministic_ats_issue",
    "explicit_skill_signal",
    "missing_role_signal",
    "extraction_quality_metadata",
    "target_alignment_metadata",
]

UNSUPPORTED_GUIDANCE_PHRASES = (
    "guaranteed",
    "guaranteed acceptance",
    "guaranteed interview",
    "guaranteed ats pass",
    "will pass ats",
    "best role",
    "best candidate",
    "ideal candidate",
    "highly suitable",
    "definitely qualified",
    "definitely improve hiring chances",
    "will be accepted",
    "hiring probability",
    "candidate quality score",
    "fit score",
    "pass/fail decision",
    "your resume is bad",
    "you are not qualified",
)


class RecommendationEvidence(BaseModel):
    """Traceable deterministic signal supporting a future improvement guidance item."""

    model_config = ConfigDict(extra="forbid")

    source_type: RecommendationEvidenceSourceType
    source_id: str
    summary: str

    @field_validator("source_id", "summary")
    @classmethod
    def require_non_empty_text(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("recommendation evidence text fields must not be empty")

        return value


class RecommendationSourceMetadata(BaseModel):
    """Source metadata that keeps improvement guidance bounded to deterministic inputs."""

    model_config = ConfigDict(extra="forbid")

    pipeline_stage: Literal[
        "extraction",
        "section_detection",
        "completeness",
        "ats_feedback",
        "skill_signals",
        "role_matching",
        "target_alignment",
    ]
    signal: str

    @field_validator("signal")
    @classmethod
    def require_signal(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("recommendation source signal must not be empty")

        return value


class RecommendationItem(BaseModel):
    """Advisory deterministic improvement guidance item without scoring or AI inference."""

    model_config = ConfigDict(extra="forbid")

    identifier: str
    category: RecommendationCategory
    title: str
    description: str
    priority: RecommendationPriority
    evidence: list[RecommendationEvidence]
    source_metadata: RecommendationSourceMetadata
    actionable_next_step: str
    boundary_note: str | None = None

    @field_validator(
        "identifier",
        "title",
        "description",
        "actionable_next_step",
        "boundary_note",
    )
    @classmethod
    def require_non_empty_text_when_present(cls, value: str | None) -> str | None:
        if value is not None and not value.strip():
            raise ValueError("recommendation text fields must not be empty")

        return value

    @field_validator("title", "description", "actionable_next_step", "boundary_note")
    @classmethod
    def reject_unsupported_claims(cls, value: str | None) -> str | None:
        if value is None:
            return value

        normalized_value = value.casefold()
        if any(phrase in normalized_value for phrase in UNSUPPORTED_GUIDANCE_PHRASES):
            raise ValueError("recommendation text must not include unsupported outcome claims")

        return value

    @model_validator(mode="after")
    def validate_evidence_and_action(self) -> Self:
        if not self.evidence:
            raise ValueError("recommendation item requires deterministic evidence")

        return self


class RecommendationsContract(BaseModel):
    """Canonical deterministic improvement guidance contract for future orchestration."""

    model_config = ConfigDict(extra="forbid")

    status: RecommendationStatus
    source: Literal["deterministic_analysis_metadata"] = "deterministic_analysis_metadata"
    items: list[RecommendationItem] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_state(self) -> Self:
        if self.status == "recommendations_ready" and not self.items:
            raise ValueError("recommendations_ready requires at least one recommendation item")

        if (
            self.status in {"no_recommendations", "insufficient_data", "not_evaluated"}
            and self.items
        ):
            raise ValueError("fallback recommendation states must not include items")

        return self
