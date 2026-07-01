"""Resume upload routes."""

from typing import Annotated

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse

from careerboost_api.core.config import get_settings
from careerboost_api.domain import ResumeAnalysisContract
from careerboost_api.services.resume_extraction import (
    ResumeTextExtractionError,
    ResumeTextExtractor,
)
from careerboost_api.services.resume_intake import ResumeIntakeOrchestrator
from careerboost_api.services.resume_upload import (
    ResumeUploadValidationError,
    ResumeUploadValidator,
)

router = APIRouter(prefix="/resumes", tags=["resumes"])


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
    orchestrator = ResumeIntakeOrchestrator()

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

    try:
        extraction = extractor.extract(content)
    except ResumeTextExtractionError as exc:
        analysis = orchestrator.build_extraction_failure(
            upload=validated_upload,
            error=exc,
        )
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            content=analysis.model_dump(mode="json"),
        )

    return orchestrator.build_success(
        upload=validated_upload,
        extraction=extraction,
    )
