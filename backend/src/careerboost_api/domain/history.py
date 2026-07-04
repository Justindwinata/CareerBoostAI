"""Analysis history contracts for local demo persistence."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from careerboost_api.domain.target_alignment import TargetAlignmentStatus
from careerboost_api.domain.target_criteria import TargetCriteriaStatus


class AnalysisHistorySummary(BaseModel):
    """List-safe summary of a stored completed analysis."""

    model_config = ConfigDict(extra="forbid")

    analysis_id: str
    created_at: str
    filename: str
    target_role: str = ""
    target_criteria_status: TargetCriteriaStatus
    target_alignment_status: TargetAlignmentStatus
    detected_section_count: int = Field(ge=0)
    skill_signal_count: int = Field(ge=0)
    role_profile_count: int = Field(ge=0)

    @field_validator("analysis_id", "created_at", "filename")
    @classmethod
    def require_non_empty_text(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("history summary text fields must not be empty")

        return value


class AnalysisHistoryDeleteResponse(BaseModel):
    """User-safe response after deleting a stored analysis."""

    model_config = ConfigDict(extra="forbid")

    detail: Literal["Analysis record deleted."]
