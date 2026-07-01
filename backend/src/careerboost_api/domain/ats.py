"""Deterministic ATS feedback contracts for future analysis workflows."""

from typing import Literal, Self

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from careerboost_api.domain.resume_sections import ResumeSectionName

AtsFeedbackStatus = Literal["metadata_ready", "not_evaluated"]
AtsIssueCategory = Literal[
    "section_presence",
    "section_structure",
    "formatting_risk",
    "keyword_coverage_placeholder",
    "readability_structure",
]
AtsIssueSeverity = Literal["info", "warning"]
AtsScoreStatus = Literal["not_scored"]


class AtsFeedbackIssue(BaseModel):
    """Observable deterministic ATS feedback item without scoring or advice."""

    model_config = ConfigDict(extra="forbid")

    category: AtsIssueCategory
    severity: AtsIssueSeverity
    title: str
    description: str
    observed_signal: str
    related_sections: list[ResumeSectionName] = Field(default_factory=list)

    @field_validator("title", "description", "observed_signal")
    @classmethod
    def require_non_empty_text(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("ATS feedback text fields must not be empty")

        return value


class AtsKeywordCoveragePlaceholder(BaseModel):
    """Placeholder for future keyword coverage analysis without extraction or scoring."""

    model_config = ConfigDict(extra="forbid")

    status: Literal["not_evaluated"] = "not_evaluated"
    matched_keywords: list[str] = Field(default_factory=list)
    missing_keywords: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_placeholder_state(self) -> Self:
        if self.matched_keywords or self.missing_keywords:
            raise ValueError("keyword coverage placeholder must not include keyword results")

        return self


class AtsScorePlaceholder(BaseModel):
    """Explicit marker that ATS scoring has not been implemented."""

    model_config = ConfigDict(extra="forbid")

    status: AtsScoreStatus = "not_scored"
    score: None = None


class AtsFeedbackContract(BaseModel):
    """Canonical deterministic ATS feedback metadata contract."""

    model_config = ConfigDict(extra="forbid")

    status: AtsFeedbackStatus = "metadata_ready"
    source: Literal["deterministic_resume_signals"] = "deterministic_resume_signals"
    issues: list[AtsFeedbackIssue] = Field(default_factory=list)
    keyword_coverage: AtsKeywordCoveragePlaceholder = Field(
        default_factory=AtsKeywordCoveragePlaceholder
    )
    score: AtsScorePlaceholder = Field(default_factory=AtsScorePlaceholder)
