"""Resume upload routes."""

from typing import Annotated, Literal

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from pydantic import BaseModel, ConfigDict

from careerboost_api.core.config import get_settings
from careerboost_api.services.resume_upload import (
    ResumeUploadValidationError,
    ResumeUploadValidator,
)

router = APIRouter(prefix="/resumes", tags=["resumes"])


class ResumeUploadResponse(BaseModel):
    """Response returned after a resume passes upload validation."""

    model_config = ConfigDict(extra="forbid")

    status: Literal["accepted"]
    filename: str
    content_type: str
    size_bytes: int
    message: str


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

    return ResumeUploadResponse(
        status="accepted",
        filename=validated_upload.filename,
        content_type=validated_upload.content_type,
        size_bytes=validated_upload.size_bytes,
        message="Resume upload accepted. Analysis is not started in this contract.",
    )
