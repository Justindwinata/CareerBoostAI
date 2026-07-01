"""Domain contracts for CareerBoost AI."""

from careerboost_api.domain.analysis import (
    AnalysisError,
    AnalysisErrorCategory,
    AnalysisStagePlaceholder,
    AnalysisStatus,
    DetectedResumeSection,
    ExtractionConfidence,
    ExtractionStatus,
    FutureStageStatus,
    IntakeStatus,
    ResumeAnalysisContract,
    ResumeCompletenessContract,
    ResumeExtractionContract,
    ResumeIntakeContract,
    ResumeSectionName,
)

__all__ = [
    "AnalysisError",
    "AnalysisErrorCategory",
    "AnalysisStagePlaceholder",
    "AnalysisStatus",
    "DetectedResumeSection",
    "ExtractionConfidence",
    "ExtractionStatus",
    "FutureStageStatus",
    "IntakeStatus",
    "ResumeAnalysisContract",
    "ResumeCompletenessContract",
    "ResumeExtractionContract",
    "ResumeIntakeContract",
    "ResumeSectionName",
]
