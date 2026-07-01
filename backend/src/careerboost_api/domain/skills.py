"""Deterministic skill signal contracts for resume analysis workflows."""

from typing import Literal, Self

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from careerboost_api.domain.resume_sections import ResumeSectionName

SkillSignalStatus = Literal["signals_detected", "no_signals", "not_evaluated"]
SkillSignalCategory = Literal[
    "programming_language",
    "framework",
    "database",
    "tooling",
    "testing",
    "web_technology",
]
SkillEvidenceLevel = Literal["explicit_mention"]
SkillSourceArea = ResumeSectionName | Literal["document"]


class SkillSignalEvidence(BaseModel):
    """Location and text evidence for an explicit skill mention."""

    model_config = ConfigDict(extra="forbid")

    matched_text: str
    source_area: SkillSourceArea
    line_number: int = Field(ge=1)
    evidence_text: str

    @field_validator("matched_text", "evidence_text")
    @classmethod
    def require_non_empty_text(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("skill evidence text fields must not be empty")

        return value


class SkillSignal(BaseModel):
    """Explicit deterministic skill signal without scoring, ranking, or inference."""

    model_config = ConfigDict(extra="forbid")

    name: str
    category: SkillSignalCategory
    evidence_level: SkillEvidenceLevel = "explicit_mention"
    evidence: list[SkillSignalEvidence]

    @field_validator("name")
    @classmethod
    def require_skill_name(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("skill name must not be empty")

        return value

    @model_validator(mode="after")
    def require_evidence(self) -> Self:
        if not self.evidence:
            raise ValueError("skill signal requires explicit evidence")

        return self


class SkillSignalsContract(BaseModel):
    """Canonical deterministic skill signal metadata contract."""

    model_config = ConfigDict(extra="forbid")

    status: SkillSignalStatus
    source: Literal["deterministic_normalized_text"] = "deterministic_normalized_text"
    signals: list[SkillSignal] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_state(self) -> Self:
        if self.status == "signals_detected" and not self.signals:
            raise ValueError("signals_detected requires at least one skill signal")

        if self.status in {"no_signals", "not_evaluated"} and self.signals:
            raise ValueError("fallback skill signal states must not include signals")

        return self
