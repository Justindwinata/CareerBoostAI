"""Analysis history routes."""

from fastapi import APIRouter, HTTPException, Query, Response, status

from careerboost_api.core.config import get_settings
from careerboost_api.domain import (
    AnalysisHistoryDeleteResponse,
    AnalysisHistorySummary,
    ResumeAnalysisContract,
)
from careerboost_api.services.analysis_history import (
    AnalysisHistoryRepository,
    AnalysisHistoryService,
    AnalysisHistoryStorageError,
)
from careerboost_api.services.analysis_report import AnalysisReportService

router = APIRouter(prefix="/analyses", tags=["analyses"])

NOT_FOUND_DETAIL = "Analysis record was not found."
STORAGE_FAILURE_DETAIL = "Analysis history storage is unavailable."


def get_analysis_history_service() -> AnalysisHistoryService:
    """Build the configured local analysis history service."""
    settings = get_settings()
    repository = AnalysisHistoryRepository(settings.analysis_history_database_path)
    return AnalysisHistoryService(repository)


@router.get("", response_model=list[AnalysisHistorySummary])
def list_analyses(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> list[AnalysisHistorySummary]:
    """Return local completed analysis summaries ordered newest first."""
    try:
        return get_analysis_history_service().list_summaries(limit=limit, offset=offset)
    except AnalysisHistoryStorageError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=STORAGE_FAILURE_DETAIL,
        ) from exc


@router.get("/{analysis_id}", response_model=ResumeAnalysisContract)
def get_analysis(analysis_id: str) -> ResumeAnalysisContract:
    """Return the full canonical analysis response for a stored analysis."""
    try:
        analysis = get_analysis_history_service().get_analysis(analysis_id)
    except AnalysisHistoryStorageError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=STORAGE_FAILURE_DETAIL,
        ) from exc

    if analysis is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=NOT_FOUND_DETAIL)

    return analysis


@router.get("/{analysis_id}/report.html")
def download_analysis_report(analysis_id: str) -> Response:
    """Download a standalone HTML report for a stored analysis."""
    try:
        analysis = get_analysis_history_service().get_analysis(analysis_id)
    except AnalysisHistoryStorageError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=STORAGE_FAILURE_DETAIL,
        ) from exc

    if analysis is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=NOT_FOUND_DETAIL)

    report_html = AnalysisReportService().generate_html_report(analysis)
    filename = f"careerboost-analysis-{analysis_id}.html"
    return Response(
        content=report_html,
        media_type="text/html; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.delete("/{analysis_id}", response_model=AnalysisHistoryDeleteResponse)
def delete_analysis(analysis_id: str) -> AnalysisHistoryDeleteResponse:
    """Delete a stored analysis by public analysis ID."""
    try:
        deleted = get_analysis_history_service().delete_analysis(analysis_id)
    except AnalysisHistoryStorageError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=STORAGE_FAILURE_DETAIL,
        ) from exc

    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=NOT_FOUND_DETAIL)

    return AnalysisHistoryDeleteResponse(detail="Analysis record deleted.")
