"""Domain contracts for CareerBoost AI."""

from careerboost_api.domain.analysis import (
    AnalysisError,
    AnalysisErrorCategory,
    AnalysisStagePlaceholder,
    AnalysisStatus,
    ExtractionConfidence,
    ExtractionStatus,
    FutureStageStatus,
    IntakeStatus,
    ResumeAnalysisContract,
    ResumeExtractionContract,
    ResumeIntakeContract,
)

__all__ = [
    "AnalysisError",
    "AnalysisErrorCategory",
    "AnalysisStagePlaceholder",
    "AnalysisStatus",
    "ExtractionConfidence",
    "ExtractionStatus",
    "FutureStageStatus",
    "IntakeStatus",
    "ResumeAnalysisContract",
    "ResumeExtractionContract",
    "ResumeIntakeContract",
]
