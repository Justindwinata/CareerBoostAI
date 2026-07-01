"""Resume intake orchestration service."""

from careerboost_api.domain import (
    AnalysisError,
    AnalysisErrorCategory,
    ResumeAnalysisContract,
    ResumeExtractionContract,
    ResumeIntakeContract,
)
from careerboost_api.services.ats_feedback import AtsFeedbackService
from careerboost_api.services.resume_completeness import ResumeCompletenessCalculator
from careerboost_api.services.resume_extraction import (
    ResumeTextExtractionError,
    ResumeTextExtractionResult,
)
from careerboost_api.services.resume_text_processing import ResumeTextProcessor
from careerboost_api.services.resume_upload import ValidatedResumeUpload
from careerboost_api.services.role_matching import RoleMatchingService
from careerboost_api.services.skill_signals import SkillSignalExtractor

LOW_TEXT_EXTRACTION_MESSAGE = "Resume text is too short to analyze. Upload a text-based PDF resume."


class ResumeIntakeOrchestrator:
    """Map validated resume intake outcomes into the canonical analysis contract."""

    def __init__(
        self,
        text_processor: ResumeTextProcessor | None = None,
        completeness_calculator: ResumeCompletenessCalculator | None = None,
        ats_feedback_service: AtsFeedbackService | None = None,
        skill_signal_extractor: SkillSignalExtractor | None = None,
        role_matching_service: RoleMatchingService | None = None,
    ) -> None:
        self.text_processor = text_processor or ResumeTextProcessor()
        self.completeness_calculator = completeness_calculator or ResumeCompletenessCalculator()
        self.ats_feedback_service = ats_feedback_service or AtsFeedbackService()
        self.skill_signal_extractor = skill_signal_extractor or SkillSignalExtractor()
        self.role_matching_service = role_matching_service or RoleMatchingService()

    def build_success(
        self,
        *,
        upload: ValidatedResumeUpload,
        extraction: ResumeTextExtractionResult,
    ) -> ResumeAnalysisContract:
        processed_text = self.text_processor.process(extraction.extracted_text)
        completeness = self.completeness_calculator.calculate(processed_text.sections)

        extraction_contract = ResumeExtractionContract(
            status="extracted",
            confidence=extraction.confidence,
            character_count=extraction.character_count,
            page_count=extraction.page_count,
            extracted_text=extraction.extracted_text,
            normalized_text=processed_text.normalized_text,
            sections=processed_text.sections,
        )

        skill_signals = self.skill_signal_extractor.extract(
            normalized_text=extraction_contract.normalized_text,
            sections=extraction_contract.sections,
        )

        return ResumeAnalysisContract(
            status="intake_completed",
            intake=self._build_intake(upload),
            extraction=extraction_contract,
            completeness=completeness,
            ats=self.ats_feedback_service.generate(
                extraction=extraction_contract,
                completeness=completeness,
            ),
            skills=skill_signals,
            roles=self.role_matching_service.match(
                skills=skill_signals,
                sections=extraction_contract.sections,
                completeness=completeness,
            ),
        )

    def build_extraction_failure(
        self,
        *,
        upload: ValidatedResumeUpload,
        error: ResumeTextExtractionError,
    ) -> ResumeAnalysisContract:
        extraction_contract = ResumeExtractionContract(
            status="failed",
            error=AnalysisError(
                category=self._categorize_extraction_error(error),
                message=str(error),
            ),
        )

        skill_signals = self.skill_signal_extractor.extract(
            normalized_text=extraction_contract.normalized_text,
            sections=extraction_contract.sections,
        )

        return ResumeAnalysisContract(
            status="failed",
            intake=self._build_intake(upload),
            extraction=extraction_contract,
            ats=self.ats_feedback_service.generate(
                extraction=extraction_contract,
                completeness=None,
            ),
            skills=skill_signals,
            roles=self.role_matching_service.match(
                skills=skill_signals,
                sections=extraction_contract.sections,
                completeness=None,
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
