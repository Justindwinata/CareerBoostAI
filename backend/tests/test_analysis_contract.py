import pytest
from pydantic import ValidationError

from careerboost_api.domain import (
    AnalysisError,
    ResumeAnalysisContract,
    ResumeExtractionContract,
    ResumeIntakeContract,
)


def build_intake() -> ResumeIntakeContract:
    return ResumeIntakeContract(
        status="accepted",
        filename="resume.pdf",
        content_type="application/pdf",
        size_bytes=128_000,
    )


def test_analysis_contract_represents_successful_resume_intake() -> None:
    contract = ResumeAnalysisContract(
        status="intake_completed",
        intake=build_intake(),
        extraction=ResumeExtractionContract(
            status="extracted",
            confidence="high",
            character_count=850,
            page_count=2,
            extracted_text="Software engineering resume with project and internship experience.",
        ),
    )

    assert contract.status == "intake_completed"
    assert contract.intake.filename == "resume.pdf"
    assert contract.extraction.status == "extracted"
    assert contract.extraction.confidence == "high"
    assert contract.ats.status == "not_started"
    assert contract.skills.status == "not_started"
    assert contract.roles.status == "not_started"
    assert contract.recommendations.status == "not_started"


def test_analysis_contract_represents_low_text_extraction_failure() -> None:
    contract = ResumeAnalysisContract(
        status="failed",
        intake=build_intake(),
        extraction=ResumeExtractionContract(
            status="failed",
            character_count=12,
            page_count=1,
            error=AnalysisError(
                category="low_text",
                message="Resume text is too short to analyze. Upload a text-based PDF resume.",
            ),
        ),
    )

    assert contract.extraction.status == "failed"
    assert contract.extraction.error is not None
    assert contract.extraction.error.category == "low_text"
    assert contract.extraction.confidence is None
    assert contract.extraction.extracted_text is None


def test_analysis_contract_represents_unreadable_pdf_failure() -> None:
    contract = ResumeAnalysisContract(
        status="failed",
        intake=build_intake(),
        extraction=ResumeExtractionContract(
            status="failed",
            error=AnalysisError(
                category="unreadable_pdf",
                message="Resume text could not be extracted from this PDF.",
            ),
        ),
    )

    assert contract.extraction.error is not None
    assert contract.extraction.error.category == "unreadable_pdf"


def test_successful_extraction_requires_text_and_confidence() -> None:
    with pytest.raises(ValidationError):
        ResumeExtractionContract(
            status="extracted",
            character_count=120,
            page_count=1,
        )


def test_failed_extraction_requires_user_safe_error() -> None:
    with pytest.raises(ValidationError):
        ResumeExtractionContract(status="failed")


def test_completed_analysis_rejects_failed_extraction() -> None:
    with pytest.raises(ValidationError):
        ResumeAnalysisContract(
            status="intake_completed",
            intake=build_intake(),
            extraction=ResumeExtractionContract(
                status="failed",
                error=AnalysisError(
                    category="extraction_error",
                    message="Resume text could not be extracted from this PDF.",
                ),
            ),
        )


def test_contract_rejects_extra_fields() -> None:
    with pytest.raises(ValidationError):
        ResumeAnalysisContract(
            status="intake_completed",
            intake=build_intake(),
            extraction=ResumeExtractionContract(
                status="extracted",
                confidence="medium",
                character_count=120,
                page_count=1,
                extracted_text="Readable resume content for analysis contract validation.",
            ),
            unsupported_stage={"status": "not_started"},
        )
