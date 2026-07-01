"""Resume intake orchestration service."""

from careerboost_api.domain import (
    AnalysisError,
    AnalysisErrorCategory,
    ResumeAnalysisContract,
    ResumeExtractionContract,
    ResumeIntakeContract,
)
from careerboost_api.services.resume_extraction import (
    ResumeTextExtractionError,
    ResumeTextExtractionResult,
)
from careerboost_api.services.resume_text_processing import ResumeTextProcessor
from careerboost_api.services.resume_upload import ValidatedResumeUpload

LOW_TEXT_EXTRACTION_MESSAGE = "Resume text is too short to analyze. Upload a text-based PDF resume."


class ResumeIntakeOrchestrator:
    """Map validated resume intake outcomes into the canonical analysis contract."""

    def __init__(self, text_processor: ResumeTextProcessor | None = None) -> None:
        self.text_processor = text_processor or ResumeTextProcessor()

    def build_success(
        self,
        *,
        upload: ValidatedResumeUpload,
        extraction: ResumeTextExtractionResult,
    ) -> ResumeAnalysisContract:
        processed_text = self.text_processor.process(extraction.extracted_text)

        return ResumeAnalysisContract(
            status="intake_completed",
            intake=self._build_intake(upload),
            extraction=ResumeExtractionContract(
                status="extracted",
                confidence=extraction.confidence,
                character_count=extraction.character_count,
                page_count=extraction.page_count,
                extracted_text=extraction.extracted_text,
                normalized_text=processed_text.normalized_text,
                sections=processed_text.sections,
            ),
        )

    def build_extraction_failure(
        self,
        *,
        upload: ValidatedResumeUpload,
        error: ResumeTextExtractionError,
    ) -> ResumeAnalysisContract:
        return ResumeAnalysisContract(
            status="failed",
            intake=self._build_intake(upload),
            extraction=ResumeExtractionContract(
                status="failed",
                error=AnalysisError(
                    category=self._categorize_extraction_error(error),
                    message=str(error),
                ),
            ),
        )

    def _build_intake(self, upload: ValidatedResumeUpload) -> ResumeIntakeContract:
        return ResumeIntakeContract(
            status="accepted",
            filename=upload.filename,
            content_type=upload.content_type,
            size_bytes=upload.size_bytes,
        )

    def _categorize_extraction_error(
        self,
        error: ResumeTextExtractionError,
    ) -> AnalysisErrorCategory:
        if str(error) == LOW_TEXT_EXTRACTION_MESSAGE:
            return "low_text"

        return "unreadable_pdf"
