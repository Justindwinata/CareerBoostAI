"""Deterministic target-criteria alignment contracts."""

from typing import Literal, Self

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from careerboost_api.domain.roles import InternshipRoleName
from careerboost_api.domain.target_criteria import TargetAnalysisPriority, TargetRequiredSection

TargetAlignmentStatus = Literal["not_provided", "evaluated", "insufficient_data"]
SkillAlignmentCategory = Literal["required", "preferred"]
SkillAlignmentStatus = Literal["found", "not_found"]
SectionAlignmentStatus = Literal["detected", "missing"]
PriorityAlignmentStatus = Literal["evaluated", "not_evaluated"]
TargetRoleMappingStatus = Literal[
    "not_provided",
    "mapped_to_controlled_profile",
    "not_mapped_to_controlled_profile",
]
AlignmentEvidenceType = Literal[
    "explicit_skill_signal",
    "detected_resume_section",
    "metadata_available",
    "controlled_role_profile",
]


class AlignmentEvidence(BaseModel):
    """Traceable evidence used by deterministic target alignment."""

    model_config = ConfigDict(extra="forbid")

    source_type: AlignmentEvidenceType
    source_label: str
    source_area: str = ""
    line_number: int | None = Field(default=None, ge=1)
    detail: str

    @field_validator("source_label", "detail")
    @classmethod
    def require_non_empty_text(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("alignment evidence text fields must not be empty")

        return value


class SkillAlignmentItem(BaseModel):
    """Alignment metadata for one submitted skill criterion."""

    model_config = ConfigDict(extra="forbid")

    category: SkillAlignmentCategory
    submitted_skill: str
    normalized_skill: str
    status: SkillAlignmentStatus
    evidence: list[AlignmentEvidence] = Field(default_factory=list)

    @field_validator("submitted_skill", "normalized_skill")
    @classmethod
    def require_skill_text(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("skill alignment text fields must not be empty")

        return value

    @model_validator(mode="after")
    def validate_evidence_state(self) -> Self:
        if self.status == "found" and not self.evidence:
            raise ValueError("found skill alignment requires evidence")

        if self.status == "not_found" and self.evidence:
            raise ValueError("missing skill alignment must not include evidence")

        return self


class SectionAlignmentItem(BaseModel):
    """Alignment metadata for one submitted required resume section."""

    model_config = ConfigDict(extra="forbid")

    section: TargetRequiredSection
    display_label: str
    status: SectionAlignmentStatus
    evidence: list[AlignmentEvidence] = Field(default_factory=list)

    @field_validator("display_label")
    @classmethod
    def require_display_label(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("section alignment display label must not be empty")

        return value

    @model_validator(mode="after")
    def validate_evidence_state(self) -> Self:
        if self.status == "detected" and not self.evidence:
            raise ValueError("detected section alignment requires evidence")

        if self.status == "missing" and self.evidence:
            raise ValueError("missing section alignment must not include evidence")

        return self


class PriorityAlignmentItem(BaseModel):
    """Metadata availability state for one selected analysis priority."""

    model_config = ConfigDict(extra="forbid")

    priority: TargetAnalysisPriority
    display_label: str
    status: PriorityAlignmentStatus
    evidence: list[AlignmentEvidence] = Field(default_factory=list)

    @field_validator("display_label")
    @classmethod
    def require_display_label(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("priority alignment display label must not be empty")

        return value

    @model_validator(mode="after")
    def validate_evidence_state(self) -> Self:
        if self.status == "evaluated" and not self.evidence:
            raise ValueError("evaluated priority alignment requires evidence")

        if self.status == "not_evaluated" and self.evidence:
            raise ValueError("not_evaluated priority alignment must not include evidence")

        return self


class TargetRoleContext(BaseModel):
    """Controlled-profile mapping metadata for the submitted target role."""

    model_config = ConfigDict(extra="forbid")

    status: TargetRoleMappingStatus = "not_provided"
    target_role: str = ""
    controlled_profile: InternshipRoleName | None = None
    evidence: list[AlignmentEvidence] = Field(default_factory=list)

    @field_validator("target_role")
    @classmethod
    def normalize_target_role(cls, value: str) -> str:
        return value.strip()

    @model_validator(mode="after")
    def validate_state(self) -> Self:
        if self.status == "not_provided":
            if self.target_role or self.controlled_profile is not None or self.evidence:
                raise ValueError("not_provided target role context must be empty")
            return self

        if not self.target_role:
            raise ValueError("target role context requires target_role when provided")

        if self.status == "mapped_to_controlled_profile":
            if self.controlled_profile is None or not self.evidence:
                raise ValueError("mapped target role context requires profile evidence")
            return self

        if self.controlled_profile is not None or self.evidence:
            raise ValueError("unmapped target role context must not include controlled evidence")

        return self


class TargetAlignmentSummary(BaseModel):
    """Factual aggregate counts for target alignment metadata."""

    model_config = ConfigDict(extra="forbid")

    required_skills_total: int = Field(default=0, ge=0)
    required_skills_found: int = Field(default=0, ge=0)
    required_skills_missing: int = Field(default=0, ge=0)
    preferred_skills_total: int = Field(default=0, ge=0)
    preferred_skills_found: int = Field(default=0, ge=0)
    required_sections_total: int = Field(default=0, ge=0)
    required_sections_found: int = Field(default=0, ge=0)
    required_sections_missing: int = Field(default=0, ge=0)
    priorities_total: int = Field(default=0, ge=0)
    priorities_evaluated: int = Field(default=0, ge=0)

    @model_validator(mode="after")
    def validate_count_consistency(self) -> Self:
        if self.required_skills_found + self.required_skills_missing != self.required_skills_total:
            raise ValueError("required skill counts must match total")

        if self.preferred_skills_found > self.preferred_skills_total:
            raise ValueError("preferred skills found cannot exceed total")

        if (
            self.required_sections_found + self.required_sections_missing
            != self.required_sections_total
        ):
            raise ValueError("required section counts must match total")

        if self.priorities_evaluated > self.priorities_total:
            raise ValueError("priorities evaluated cannot exceed total")

        return self


class TargetAlignmentContract(BaseModel):
    """Canonical deterministic alignment metadata without scoring or predictions."""

    model_config = ConfigDict(extra="forbid")

    status: TargetAlignmentStatus = "not_provided"
    summary: TargetAlignmentSummary = Field(default_factory=TargetAlignmentSummary)
    required_skills: list[SkillAlignmentItem] = Field(default_factory=list)
    preferred_skills: list[SkillAlignmentItem] = Field(default_factory=list)
    required_sections: list[SectionAlignmentItem] = Field(default_factory=list)
    analysis_priorities: list[PriorityAlignmentItem] = Field(default_factory=list)
    target_role: TargetRoleContext = Field(default_factory=TargetRoleContext)
    message: str = "No target criteria were provided for this analysis."

    @field_validator("message")
    @classmethod
    def require_message(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("target alignment message must not be empty")

        return value

    @model_validator(mode="after")
    def validate_state(self) -> Self:
        has_items = any(
            [
                self.required_skills,
                self.preferred_skills,
                self.required_sections,
                self.analysis_priorities,
                self.target_role.status != "not_provided",
            ]
        )

        if self.status == "not_provided" and has_items:
            raise ValueError("not_provided alignment must not include criteria items")

        if self.status == "insufficient_data" and has_items:
            raise ValueError("insufficient_data alignment must not include evaluated items")

        return self
