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
            extracted_text=(
                "Summary\n"
                "Backend-focused student developer.\n\n"
                "Technical Skills\n"
                "Python, FastAPI, React\n\n"
                "Projects\n"
                "CareerBoost AI"
            ),
            confidence="medium",
            character_count=118,
            page_count=1,
        ),
    )

    assert contract.status == "intake_completed"
    assert contract.intake.filename == "resume.pdf"
    assert contract.extraction.status == "extracted"
    assert contract.extraction.confidence == "medium"
    assert contract.extraction.normalized_text is not None
    assert "Technical Skills" in contract.extraction.normalized_text
    assert [section.name for section in contract.extraction.sections] == [
        "summary",
        "skills",
        "projects",
    ]
    assert contract.completeness is not None
    assert contract.completeness.present_sections == ["summary", "skills", "projects"]
    assert contract.completeness.missing_sections == ["experience", "education"]
    assert contract.completeness.score == 0.6
    assert contract.ats.status == "metadata_ready"
    assert contract.ats.score.status == "not_scored"
    assert [issue.observed_signal for issue in contract.ats.issues] == [
        "missing_section:experience",
        "missing_section:education",
        "character_count:<600",
        "extraction_confidence:medium",
        "keyword_coverage:not_evaluated",
    ]
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
    assert contract.extraction.normalized_text is None
    assert contract.extraction.sections == []
    assert contract.completeness is None
    assert contract.ats.status == "not_evaluated"
    assert contract.ats.issues[0].observed_signal == "ats_feedback:insufficient_data"


def test_orchestrator_builds_unreadable_pdf_failure_contract() -> None:
    orchestrator = ResumeIntakeOrchestrator()

    contract = orchestrator.build_extraction_failure(
        upload=build_upload(),
        error=ResumeTextExtractionError("Resume text could not be extracted from this PDF."),
    )

    assert contract.status == "failed"
    assert contract.extraction.error is not None
    assert contract.extraction.error.category == "unreadable_pdf"
    assert contract.completeness is None
    assert contract.ats.status == "not_evaluated"
