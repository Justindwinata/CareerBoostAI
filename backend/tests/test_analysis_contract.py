import pytest
from pydantic import ValidationError

from careerboost_api.domain import (
    AnalysisError,
    DetectedResumeSection,
    ResumeAnalysisContract,
    ResumeCompletenessContract,
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
            normalized_text="Software engineering resume with project and internship experience.",
            sections=[
                DetectedResumeSection(
                    name="projects",
                    heading="Projects",
                    start_line=1,
                    end_line=2,
                    content="Portfolio API",
                )
            ],
        ),
        completeness=ResumeCompletenessContract(
            expected_sections=["summary", "skills", "experience", "education", "projects"],
            present_sections=["projects"],
            missing_sections=["summary", "skills", "experience", "education"],
            score=0.2,
        ),
    )

    assert contract.status == "intake_completed"
    assert contract.intake.filename == "resume.pdf"
    assert contract.extraction.status == "extracted"
    assert contract.extraction.confidence == "high"
    assert contract.extraction.normalized_text is not None
    assert contract.extraction.sections[0].name == "projects"
    assert contract.completeness is not None
    assert contract.completeness.score == 0.2
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
    assert contract.extraction.normalized_text is None
    assert contract.extraction.sections == []


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
            normalized_text="Readable resume text.",
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
                normalized_text="Readable resume content for analysis contract validation.",
            ),
            completeness=ResumeCompletenessContract(
                expected_sections=["summary", "skills", "experience", "education", "projects"],
                present_sections=[],
                missing_sections=["summary", "skills", "experience", "education", "projects"],
                score=0,
            ),
            unsupported_stage={"status": "not_started"},
        )


def test_successful_analysis_requires_completeness_metadata() -> None:
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
                normalized_text="Readable resume content for analysis contract validation.",
            ),
        )


def test_completeness_rejects_incomplete_section_coverage() -> None:
    with pytest.raises(ValidationError):
        ResumeCompletenessContract(
            expected_sections=["summary", "skills", "experience", "education", "projects"],
            present_sections=["summary"],
            missing_sections=["skills"],
            score=0.2,
        )
