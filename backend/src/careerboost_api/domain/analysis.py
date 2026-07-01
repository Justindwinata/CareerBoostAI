"""Canonical analysis result contract for resume intake workflows."""

from typing import Literal, Self

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

AnalysisStatus = Literal["intake_completed", "failed"]
AnalysisErrorCategory = Literal[
    "empty_upload",
    "encrypted_pdf",
    "extraction_error",
    "file_too_large",
    "invalid_file_type",
    "invalid_pdf",
    "low_text",
    "unreadable_pdf",
    "validation_error",
]
ExtractionConfidence = Literal["medium", "high"]
ExtractionStatus = Literal["extracted", "failed"]
FutureStageStatus = Literal["not_started"]
IntakeStatus = Literal["accepted"]


class AnalysisError(BaseModel):
    """User-safe error detail for failed intake or extraction states."""

    model_config = ConfigDict(extra="forbid")

    category: AnalysisErrorCategory
    message: str

    @field_validator("message")
    @classmethod
    def require_actionable_message(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("analysis error message must not be empty")

        return value


class ResumeIntakeContract(BaseModel):
    """Validated resume file metadata captured before analysis begins."""

    model_config = ConfigDict(extra="forbid")

    status: IntakeStatus
    filename: str
    content_type: Literal["application/pdf"]
    size_bytes: int = Field(gt=0)

    @field_validator("filename")
    @classmethod
    def require_filename(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("filename must not be empty")

        return value


class ResumeExtractionContract(BaseModel):
    """Text extraction outcome for a validated resume PDF."""

    model_config = ConfigDict(extra="forbid")

    status: ExtractionStatus
    confidence: ExtractionConfidence | None = None
    character_count: int = Field(default=0, ge=0)
    page_count: int = Field(default=0, ge=0)
    extracted_text: str | None = None
    error: AnalysisError | None = None

    @model_validator(mode="after")
    def validate_state(self) -> Self:
        if self.status == "extracted":
            if self.confidence is None:
                raise ValueError("successful extraction requires confidence")
            if not self.extracted_text:
                raise ValueError("successful extraction requires extracted text")
            if self.character_count <= 0:
                raise ValueError("successful extraction requires a positive character count")
            if self.page_count <= 0:
                raise ValueError("successful extraction requires a positive page count")
            if self.error is not None:
                raise ValueError("successful extraction must not include an error")
            return self

        if self.error is None:
            raise ValueError("failed extraction requires an error")
        if self.confidence is not None:
            raise ValueError("failed extraction must not include confidence")
        if self.extracted_text is not None:
            raise ValueError("failed extraction must not include extracted text")

        return self


class AnalysisStagePlaceholder(BaseModel):
    """Explicit placeholder for future analysis stages not implemented in Sprint 2."""

    model_config = ConfigDict(extra="forbid")

    status: FutureStageStatus = "not_started"
    name: Literal["ats", "skills", "roles", "recommendations"]
    label: str

    @field_validator("label")
    @classmethod
    def require_label(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("analysis stage label must not be empty")

        return value


class ResumeAnalysisContract(BaseModel):
    """Canonical result shape shared by future resume analysis orchestration."""

    model_config = ConfigDict(extra="forbid")

    status: AnalysisStatus
    intake: ResumeIntakeContract
    extraction: ResumeExtractionContract
    ats: AnalysisStagePlaceholder = Field(
        default_factory=lambda: AnalysisStagePlaceholder(name="ats", label="ATS analysis")
    )
    skills: AnalysisStagePlaceholder = Field(
        default_factory=lambda: AnalysisStagePlaceholder(name="skills", label="Skill extraction")
    )
    roles: AnalysisStagePlaceholder = Field(
        default_factory=lambda: AnalysisStagePlaceholder(name="roles", label="Role matching")
    )
    recommendations: AnalysisStagePlaceholder = Field(
        default_factory=lambda: AnalysisStagePlaceholder(
            name="recommendations",
            label="Learning recommendations",
        )
    )

    @model_validator(mode="after")
    def validate_contract_state(self) -> Self:
        if self.status == "intake_completed" and self.extraction.status != "extracted":
            raise ValueError("completed intake requires successful extraction")

        if self.status == "failed" and self.extraction.status != "failed":
            raise ValueError("failed analysis requires failed extraction")

        return self
