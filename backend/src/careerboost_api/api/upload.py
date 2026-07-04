"""Resume upload routes."""

import json
from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from careerboost_api.core.config import get_settings
from careerboost_api.domain import ResumeAnalysisContract, TargetCriteria
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


def parse_target_criteria(target_criteria: str | None) -> TargetCriteria:
    """Parse optional target criteria JSON from multipart form data."""
    if target_criteria is None or not target_criteria.strip():
        return TargetCriteria()

    try:
        target_criteria_payload = json.loads(target_criteria)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Target criteria must be valid JSON.",
        ) from exc

    if not isinstance(target_criteria_payload, dict):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Target criteria must be a JSON object.",
        )

    try:
        return TargetCriteria.model_validate(target_criteria_payload)
    except ValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Target criteria contains invalid values.",
        ) from exc


@router.post(
    "/upload",
    response_model=ResumeAnalysisContract,
    status_code=status.HTTP_202_ACCEPTED,
)
async def upload_resume(
    file: Annotated[UploadFile, File()],
    target_criteria: Annotated[str | None, Form()] = None,
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

    validated_target_criteria = parse_target_criteria(target_criteria)

    try:
        extraction = extractor.extract(content)
    except ResumeTextExtractionError as exc:
        analysis = orchestrator.build_extraction_failure(
            upload=validated_upload,
            error=exc,
            target_criteria=validated_target_criteria,
        )
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            content=analysis.model_dump(mode="json"),
        )

    return orchestrator.build_success(
        upload=validated_upload,
        extraction=extraction,
        target_criteria=validated_target_criteria,
    )
