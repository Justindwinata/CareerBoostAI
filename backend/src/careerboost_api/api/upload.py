"""Resume upload routes."""

from typing import Annotated, Literal

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from pydantic import BaseModel, ConfigDict

from careerboost_api.core.config import get_settings
from careerboost_api.services.resume_extraction import (
    ResumeTextExtractionError,
    ResumeTextExtractor,
)
from careerboost_api.services.resume_upload import (
    ResumeUploadValidationError,
    ResumeUploadValidator,
)

router = APIRouter(prefix="/resumes", tags=["resumes"])


class ResumeExtractionResponse(BaseModel):
    """Text extraction result for a validated resume PDF."""

    model_config = ConfigDict(extra="forbid")

    status: Literal["extracted"]
    confidence: Literal["medium", "high"]
    character_count: int
    page_count: int
    extracted_text: str


class ResumeUploadResponse(BaseModel):
    """Response returned after a resume passes upload validation."""

    model_config = ConfigDict(extra="forbid")

    status: Literal["accepted"]
    filename: str
    content_type: str
    size_bytes: int
    message: str
    extraction: ResumeExtractionResponse


@router.post(
    "/upload",
    response_model=ResumeUploadResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def upload_resume(file: Annotated[UploadFile, File()]) -> ResumeUploadResponse:
    """Accept and validate a PDF resume upload."""
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
        extraction = extractor.extract(content)
    except ResumeUploadValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(exc),
        ) from exc
    except ResumeTextExtractionError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(exc),
        ) from exc

    return ResumeUploadResponse(
        status="accepted",
        filename=validated_upload.filename,
        content_type=validated_upload.content_type,
        size_bytes=validated_upload.size_bytes,
        message="Resume upload accepted and text extraction completed.",
        extraction=ResumeExtractionResponse(
            status="extracted",
            confidence=extraction.confidence,
            character_count=extraction.character_count,
            page_count=extraction.page_count,
            extracted_text=extraction.extracted_text,
        ),
    )
