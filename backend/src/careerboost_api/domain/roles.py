"""Deterministic internship role matching contracts."""

from typing import Literal, Self

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from careerboost_api.domain.resume_sections import ResumeSectionName

RoleMatchContractStatus = Literal["metadata_ready", "insufficient_data", "not_evaluated"]
RoleMatchStatus = Literal["matched", "partial_match", "not_matched", "insufficient_data"]
RoleMatchConfidenceState = Literal["metadata_ready", "insufficient_data", "not_evaluated"]
InternshipRoleName = Literal[
    "Backend Developer Intern",
    "Frontend Developer Intern",
    "Full Stack Developer Intern",
    "Data Analyst Intern",
    "Machine Learning Intern",
]


class RoleMatchCandidate(BaseModel):
    """Deterministic role candidate metadata without ranking or recommendations."""

    model_config = ConfigDict(extra="forbid")

    role_name: InternshipRoleName
    match_status: RoleMatchStatus
    confidence_state: RoleMatchConfidenceState
    deterministic_evidence: list[str] = Field(default_factory=list)
    matched_skill_signals: list[str] = Field(default_factory=list)
    missing_required_signals: list[str] = Field(default_factory=list)
    supporting_sections: list[ResumeSectionName] = Field(default_factory=list)

    @field_validator("deterministic_evidence", "matched_skill_signals", "missing_required_signals")
    @classmethod
    def require_non_empty_items(cls, value: list[str]) -> list[str]:
        if any(not item.strip() for item in value):
            raise ValueError("role match list items must not be empty")

        return value

    @model_validator(mode="after")
    def validate_state(self) -> Self:
        if self.confidence_state == "metadata_ready" and self.match_status == "insufficient_data":
            raise ValueError("metadata_ready role candidates must have a concrete match status")

        if self.confidence_state != "metadata_ready" and self.match_status != "insufficient_data":
            raise ValueError("non-ready role candidates must use insufficient_data match status")

        return self


class RoleMatchesContract(BaseModel):
    """Canonical deterministic role matching metadata contract."""

    model_config = ConfigDict(extra="forbid")

    status: RoleMatchContractStatus
    source: Literal["deterministic_resume_metadata"] = "deterministic_resume_metadata"
    candidates: list[RoleMatchCandidate] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_state(self) -> Self:
        if self.status == "metadata_ready" and not self.candidates:
            raise ValueError("metadata_ready role matching requires candidates")

        if self.status == "not_evaluated" and self.candidates:
            raise ValueError("not_evaluated role matching must not include candidates")

        return self
