"""Local SQLite persistence for completed resume analyses."""

import json
import sqlite3
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from pydantic import ValidationError

from careerboost_api.domain import (
    AnalysisHistorySummary,
    ResumeAnalysisContract,
    RoleMatchesContract,
    SkillSignalsContract,
)


class AnalysisHistoryStorageError(Exception):
    """Raised when local analysis history persistence cannot complete safely."""


@dataclass(frozen=True)
class StoredAnalysisRecord:
    """Full stored analysis record returned by the repository."""

    summary: AnalysisHistorySummary
    response: ResumeAnalysisContract


class AnalysisHistoryRepository:
    """SQLite-backed repository for local completed analysis history."""

    def __init__(self, database_path: str | Path) -> None:
        self.database_path = Path(database_path)

    def initialize(self) -> None:
        """Create the database table when local storage is first used."""
        try:
            self.database_path.parent.mkdir(parents=True, exist_ok=True)
            with self._connect() as connection:
                connection.execute(
                    """
                    CREATE TABLE IF NOT EXISTS analysis_history (
                        analysis_id TEXT PRIMARY KEY,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL,
                        filename TEXT NOT NULL,
                        file_size INTEGER NOT NULL,
                        upload_status TEXT NOT NULL,
                        extraction_status TEXT NOT NULL,
                        target_criteria_status TEXT NOT NULL,
                        target_role TEXT NOT NULL,
                        target_alignment_status TEXT NOT NULL,
                        detected_section_count INTEGER NOT NULL,
                        skill_signal_count INTEGER NOT NULL,
                        role_profile_count INTEGER NOT NULL,
                        analysis_json TEXT NOT NULL
                    )
                    """
                )
        except sqlite3.Error as exc:
            raise AnalysisHistoryStorageError(
                "analysis history storage could not initialize"
            ) from exc

    def save(
        self,
        *,
        analysis: ResumeAnalysisContract,
        created_at: str,
        updated_at: str,
    ) -> None:
        """Persist a completed canonical analysis response."""
        if analysis.analysis_id is None:
            raise AnalysisHistoryStorageError("analysis_id is required before persistence")

        payload = analysis.model_dump(mode="json")
        try:
            analysis_json = json.dumps(payload, separators=(",", ":"), sort_keys=True)
            with self._connect() as connection:
                connection.execute(
                    """
                    INSERT INTO analysis_history (
                        analysis_id,
                        created_at,
                        updated_at,
                        filename,
                        file_size,
                        upload_status,
                        extraction_status,
                        target_criteria_status,
                        target_role,
                        target_alignment_status,
                        detected_section_count,
                        skill_signal_count,
                        role_profile_count,
                        analysis_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        analysis.analysis_id,
                        created_at,
                        updated_at,
                        analysis.intake.filename,
                        analysis.intake.size_bytes,
                        analysis.intake.status,
                        analysis.extraction.status,
                        analysis.target_criteria.status,
                        analysis.target_criteria.target_role,
                        analysis.target_alignment.status,
                        len(analysis.extraction.sections),
                        self._count_skill_signals(analysis),
                        self._count_role_profiles(analysis),
                        analysis_json,
                    ),
                )
        except (TypeError, sqlite3.Error) as exc:
            raise AnalysisHistoryStorageError("analysis history record could not be saved") from exc

    def list_summaries(self, *, limit: int, offset: int) -> list[AnalysisHistorySummary]:
        """Return stored analysis summaries ordered newest first."""
        self.initialize()
        try:
            with self._connect() as connection:
                rows = connection.execute(
                    """
                    SELECT
                        analysis_id,
                        created_at,
                        filename,
                        target_role,
                        target_criteria_status,
                        target_alignment_status,
                        detected_section_count,
                        skill_signal_count,
                        role_profile_count
                    FROM analysis_history
                    ORDER BY created_at DESC, rowid DESC
                    LIMIT ? OFFSET ?
                    """,
                    (limit, offset),
                ).fetchall()

            return [self._build_summary(row) for row in rows]
        except (sqlite3.Error, ValidationError) as exc:
            raise AnalysisHistoryStorageError(
                "analysis history summaries could not be read"
            ) from exc

    def get(self, analysis_id: str) -> StoredAnalysisRecord | None:
        """Return a full stored analysis record by public analysis ID."""
        self.initialize()
        try:
            with self._connect() as connection:
                row = connection.execute(
                    """
                    SELECT
                        analysis_id,
                        created_at,
                        filename,
                        target_role,
                        target_criteria_status,
                        target_alignment_status,
                        detected_section_count,
                        skill_signal_count,
                        role_profile_count,
                        analysis_json
                    FROM analysis_history
                    WHERE analysis_id = ?
                    """,
                    (analysis_id,),
                ).fetchone()

            if row is None:
                return None

            response = ResumeAnalysisContract.model_validate(json.loads(row["analysis_json"]))
            return StoredAnalysisRecord(summary=self._build_summary(row), response=response)
        except (json.JSONDecodeError, sqlite3.Error, ValidationError) as exc:
            raise AnalysisHistoryStorageError("analysis history record could not be read") from exc

    def delete(self, analysis_id: str) -> bool:
        """Delete a stored analysis by public analysis ID."""
        self.initialize()
        try:
            with self._connect() as connection:
                cursor = connection.execute(
                    "DELETE FROM analysis_history WHERE analysis_id = ?",
                    (analysis_id,),
                )
            return cursor.rowcount > 0
        except sqlite3.Error as exc:
            raise AnalysisHistoryStorageError(
                "analysis history record could not be deleted"
            ) from exc

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.database_path)
        connection.row_factory = sqlite3.Row
        return connection

    def _build_summary(self, row: sqlite3.Row) -> AnalysisHistorySummary:
        return AnalysisHistorySummary(
            analysis_id=row["analysis_id"],
            created_at=row["created_at"],
            filename=row["filename"],
            target_role=row["target_role"],
            target_criteria_status=row["target_criteria_status"],
            target_alignment_status=row["target_alignment_status"],
            detected_section_count=row["detected_section_count"],
            skill_signal_count=row["skill_signal_count"],
            role_profile_count=row["role_profile_count"],
        )

    def _count_skill_signals(self, analysis: ResumeAnalysisContract) -> int:
        if isinstance(analysis.skills, SkillSignalsContract):
            return len(analysis.skills.signals)

        return 0

    def _count_role_profiles(self, analysis: ResumeAnalysisContract) -> int:
        if isinstance(analysis.roles, RoleMatchesContract):
            return len(analysis.roles.candidates)

        return 0


class AnalysisHistoryService:
    """Application service for completed analysis history use cases."""

    def __init__(self, repository: AnalysisHistoryRepository) -> None:
        self.repository = repository

    def store_completed_analysis(
        self,
        analysis: ResumeAnalysisContract,
    ) -> ResumeAnalysisContract:
        """Assign a public ID and persist a completed analysis."""
        if analysis.status != "intake_completed":
            raise AnalysisHistoryStorageError("only completed analyses can be persisted")

        timestamp = datetime.now(UTC).isoformat()
        analysis_with_id = analysis.model_copy(update={"analysis_id": str(uuid4())})
        self.repository.initialize()
        self.repository.save(
            analysis=analysis_with_id,
            created_at=timestamp,
            updated_at=timestamp,
        )

        return analysis_with_id

    def list_summaries(self, *, limit: int = 20, offset: int = 0) -> list[AnalysisHistorySummary]:
        """List local analysis history summaries with bounded pagination."""
        return self.repository.list_summaries(limit=min(max(limit, 1), 100), offset=max(offset, 0))

    def get_analysis(self, analysis_id: str) -> ResumeAnalysisContract | None:
        """Return a full stored analysis by public ID."""
        record = self.repository.get(analysis_id)
        if record is None:
            return None

        return record.response

    def delete_analysis(self, analysis_id: str) -> bool:
        """Delete one stored analysis by public ID."""
        return self.repository.delete(analysis_id)
