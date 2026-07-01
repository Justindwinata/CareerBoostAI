"""Resume upload routes."""

from typing import Annotated

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse

from careerboost_api.core.config import get_settings
from careerboost_api.domain import (
    AnalysisError,
    AnalysisErrorCategory,
    ResumeAnalysisContract,
    ResumeExtractionContract,
    ResumeIntakeContract,
)
from careerboost_api.services.resume_extraction import (
    ResumeTextExtractionError,
    ResumeTextExtractor,
)
from careerboost_api.services.resume_upload import (
    ResumeUploadValidationError,
    ResumeUploadValidator,
)

router = APIRouter(prefix="/resumes", tags=["resumes"])

LOW_TEXT_EXTRACTION_MESSAGE = "Resume text is too short to analyze. Upload a text-based PDF resume."


@router.post(
    "/upload",
    response_model=ResumeAnalysisContract,
    status_code=status.HTTP_202_ACCEPTED,
)
async def upload_resume(
    file: Annotated[UploadFile, File()],
) -> ResumeAnalysisContract | JSONResponse:
    """Accept, validate, and map a PDF resume into the analysis contract."""
    settings = get_settings()
    content = await file.read(settings.upload_max_file_size_bytes + 1)
    validator = ResumeUploadValidator(settings.upload_max_file_size_bytes)
    extractor = ResumeTextExtractor()

    try:
        validated_upload = validator.validate(
            filename=file.filename,
            content_type=file.content_type,
            content=content,
        )
    except ResumeUploadValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(exc),
        ) from exc

    intake = ResumeIntakeContract(
        status="accepted",
        filename=validated_upload.filename,
        content_type=validated_upload.content_type,
        size_bytes=validated_upload.size_bytes,
    )

    try:
        extraction = extractor.extract(content)
    except ResumeTextExtractionError as exc:
        analysis = ResumeAnalysisContract(
            status="failed",
            intake=intake,
            extraction=ResumeExtractionContract(
                status="failed",
                error=AnalysisError(
                    category=_categorize_extraction_error(exc),
                    message=str(exc),
                ),
            ),
        )
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            content=analysis.model_dump(mode="json"),
        )

    return ResumeAnalysisContract(
        status="intake_completed",
        intake=intake,
        extraction=ResumeExtractionContract(
            status="extracted",
            confidence=extraction.confidence,
            character_count=extraction.character_count,
            page_count=extraction.page_count,
            extracted_text=extraction.extracted_text,
        ),
    )


def _categorize_extraction_error(exc: ResumeTextExtractionError) -> AnalysisErrorCategory:
    if str(exc) == LOW_TEXT_EXTRACTION_MESSAGE:
        return "low_text"

    return "unreadable_pdf"
