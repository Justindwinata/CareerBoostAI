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
ResumeSectionName = Literal["summary", "skills", "experience", "education", "projects"]


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
    normalized_text: str | None = None
    sections: list["DetectedResumeSection"] = Field(default_factory=list)
    error: AnalysisError | None = None

    @model_validator(mode="after")
    def validate_state(self) -> Self:
        if self.status == "extracted":
            if self.confidence is None:
                raise ValueError("successful extraction requires confidence")
            if not self.extracted_text:
                raise ValueError("successful extraction requires extracted text")
            if not self.normalized_text:
                raise ValueError("successful extraction requires normalized text")
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
        if self.normalized_text is not None:
            raise ValueError("failed extraction must not include normalized text")
        if self.sections:
            raise ValueError("failed extraction must not include detected sections")

        return self


class DetectedResumeSection(BaseModel):
    """Deterministically detected resume section prepared for future analysis."""

    model_config = ConfigDict(extra="forbid")

    name: ResumeSectionName
    heading: str
    start_line: int = Field(ge=1)
    end_line: int = Field(ge=1)
    content: str = ""

    @field_validator("heading")
    @classmethod
    def require_heading(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("section heading must not be empty")

        return value

    @model_validator(mode="after")
    def validate_line_range(self) -> Self:
        if self.end_line < self.start_line:
            raise ValueError("section end line must not be before start line")

        return self


class ResumeCompletenessContract(BaseModel):
    """Deterministic section-presence baseline for future analysis stages."""

    model_config = ConfigDict(extra="forbid")

    expected_sections: list[ResumeSectionName]
    present_sections: list[ResumeSectionName]
    missing_sections: list[ResumeSectionName]
    score: float = Field(ge=0, le=1)

    @model_validator(mode="after")
    def validate_completeness_sets(self) -> Self:
        expected = set(self.expected_sections)
        present = set(self.present_sections)
        missing = set(self.missing_sections)

        if present - expected:
            raise ValueError("present sections must be part of expected sections")
        if missing - expected:
            raise ValueError("missing sections must be part of expected sections")
        if present & missing:
            raise ValueError("sections cannot be both present and missing")
        if present | missing != expected:
            raise ValueError("present and missing sections must cover all expected sections")

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
    completeness: ResumeCompletenessContract | None = None
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

        if self.status == "intake_completed" and self.completeness is None:
            raise ValueError("completed intake requires completeness metadata")

        if self.status == "failed" and self.completeness is not None:
            raise ValueError("failed analysis must not include completeness metadata")

        return self
