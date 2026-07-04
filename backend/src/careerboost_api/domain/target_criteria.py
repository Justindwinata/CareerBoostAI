"""Target application criteria metadata for resume review context."""

from typing import Literal, Self

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

TargetCriteriaStatus = Literal["not_provided", "provided"]
TargetRequiredSection = Literal[
    "summary",
    "skills",
    "experience",
    "education",
    "projects",
    "certifications",
]
TargetAnalysisPriority = Literal[
    "resume_structure",
    "ats_compatibility",
    "skill_visibility",
    "role_alignment",
    "project_evidence",
    "education_fit",
]

MAX_SKILL_LENGTH = 80


class TargetCriteria(BaseModel):
    """Validated target application context without scoring or fit claims."""

    model_config = ConfigDict(extra="forbid")

    status: TargetCriteriaStatus = "not_provided"
    target_role: str = Field(default="", max_length=120)
    target_description: str = Field(default="", max_length=3000)
    required_skills: list[str] = Field(default_factory=list, max_length=30)
    preferred_skills: list[str] = Field(default_factory=list, max_length=30)
    required_sections: list[TargetRequiredSection] = Field(default_factory=list)
    analysis_priorities: list[TargetAnalysisPriority] = Field(default_factory=list)
    experience_expectation: str = Field(default="", max_length=500)
    education_expectation: str = Field(default="", max_length=500)
    notes: str = Field(default="", max_length=1000)

    @field_validator(
        "target_role",
        "target_description",
        "experience_expectation",
        "education_expectation",
        "notes",
        mode="before",
    )
    @classmethod
    def normalize_optional_text(cls, value: object) -> str:
        if value is None:
            return ""

        if not isinstance(value, str):
            raise ValueError("target criteria text fields must be strings")

        return value.strip()

    @field_validator("required_skills", "preferred_skills", mode="before")
    @classmethod
    def normalize_skill_list(cls, value: object) -> list[str]:
        if value is None:
            return []

        if not isinstance(value, list):
            raise ValueError("skill fields must be lists")

        normalized_values: list[str] = []
        seen_values: set[str] = set()

        for item in value:
            if not isinstance(item, str):
                raise ValueError("skill entries must be strings")

            normalized_item = item.strip()
            if not normalized_item:
                continue
            if len(normalized_item) > MAX_SKILL_LENGTH:
                raise ValueError("skill entries must be 80 characters or fewer")

            normalized_key = normalized_item.casefold()
            if normalized_key in seen_values:
                continue

            seen_values.add(normalized_key)
            normalized_values.append(normalized_item)

        return normalized_values

    @field_validator("required_sections", "analysis_priorities", mode="before")
    @classmethod
    def normalize_option_list(cls, value: object) -> list[str]:
        if value is None:
            return []

        if not isinstance(value, list):
            raise ValueError("target criteria option fields must be lists")

        normalized_values: list[str] = []
        seen_values: set[str] = set()

        for item in value:
            if not isinstance(item, str):
                raise ValueError("target criteria option entries must be strings")

            normalized_item = item.strip()
            if not normalized_item:
                continue

            normalized_key = normalized_item.casefold()
            if normalized_key in seen_values:
                continue

            seen_values.add(normalized_key)
            normalized_values.append(normalized_item)

        return normalized_values

    @model_validator(mode="after")
    def set_status_from_content(self) -> Self:
        has_target_context = any(
            [
                self.target_role,
                self.target_description,
                self.required_skills,
                self.preferred_skills,
                self.required_sections,
                self.analysis_priorities,
                self.experience_expectation,
                self.education_expectation,
                self.notes,
            ]
        )
        self.status = "provided" if has_target_context else "not_provided"

        return self
