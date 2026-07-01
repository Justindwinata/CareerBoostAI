from careerboost_api.services.resume_extraction import (
    ResumeTextExtractionError,
    ResumeTextExtractionResult,
)
from careerboost_api.services.resume_intake import ResumeIntakeOrchestrator
from careerboost_api.services.resume_upload import ValidatedResumeUpload


def build_upload() -> ValidatedResumeUpload:
    return ValidatedResumeUpload(
        filename="resume.pdf",
        content_type="application/pdf",
        size_bytes=2048,
    )


def test_orchestrator_builds_successful_analysis_contract() -> None:
    orchestrator = ResumeIntakeOrchestrator()

    contract = orchestrator.build_success(
        upload=build_upload(),
        extraction=ResumeTextExtractionResult(
            extracted_text="Readable resume text with enough content for future analysis.",
            confidence="medium",
            character_count=128,
            page_count=1,
        ),
    )

    assert contract.status == "intake_completed"
    assert contract.intake.filename == "resume.pdf"
    assert contract.extraction.status == "extracted"
    assert contract.extraction.confidence == "medium"
    assert contract.ats.status == "not_started"
    assert contract.skills.status == "not_started"
    assert contract.roles.status == "not_started"
    assert contract.recommendations.status == "not_started"


def test_orchestrator_builds_low_text_failure_contract() -> None:
    orchestrator = ResumeIntakeOrchestrator()

    contract = orchestrator.build_extraction_failure(
        upload=build_upload(),
        error=ResumeTextExtractionError(
            "Resume text is too short to analyze. Upload a text-based PDF resume."
        ),
    )

    assert contract.status == "failed"
    assert contract.intake.status == "accepted"
    assert contract.extraction.status == "failed"
    assert contract.extraction.error is not None
    assert contract.extraction.error.category == "low_text"
    assert contract.extraction.error.message == (
        "Resume text is too short to analyze. Upload a text-based PDF resume."
    )


def test_orchestrator_builds_unreadable_pdf_failure_contract() -> None:
    orchestrator = ResumeIntakeOrchestrator()

    contract = orchestrator.build_extraction_failure(
        upload=build_upload(),
        error=ResumeTextExtractionError("Resume text could not be extracted from this PDF."),
    )

    assert contract.status == "failed"
    assert contract.extraction.error is not None
    assert contract.extraction.error.category == "unreadable_pdf"
