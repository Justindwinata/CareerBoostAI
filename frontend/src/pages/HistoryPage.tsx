import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  deleteAnalysis,
  listAnalysisHistory,
  type AnalysisHistoryRequestError,
} from "../services/analysisHistoryService";
import type { AnalysisHistorySummary } from "../types/resumeUpload";

type HistoryState =
  | { kind: "loading" }
  | { kind: "loaded"; analyses: AnalysisHistorySummary[] }
  | { kind: "error"; message: string };

const HISTORY_PAGE_LIMIT = 20;

function formatHistoryDate(timestamp: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function formatStatusLabel(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatCompactAnalysisId(analysisId: string): string {
  return `${analysisId.slice(0, 8)}...${analysisId.slice(-4)}`;
}

function getHistoryErrorMessage(error: unknown): string {
  const message =
    error instanceof Error && error.message ? error.message : "analysis_history_request_failed";

  if (message === "Analysis history storage is unavailable.") {
    return "Analysis history is unavailable. Check the backend connection and try again.";
  }

  return "Analysis history could not be loaded. Check the backend connection and try again.";
}

export function HistoryPage() {
  const [historyState, setHistoryState] = useState<HistoryState>({ kind: "loading" });
  const [deletingAnalysisId, setDeletingAnalysisId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setHistoryState({ kind: "loading" });
    setDeleteError(null);

    try {
      const analyses = await listAnalysisHistory({ limit: HISTORY_PAGE_LIMIT, offset: 0 });
      setHistoryState({ kind: "loaded", analyses });
    } catch (error) {
      setHistoryState({ kind: "error", message: getHistoryErrorMessage(error) });
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    listAnalysisHistory({ limit: HISTORY_PAGE_LIMIT, offset: 0 })
      .then((analyses) => {
        if (isMounted) {
          setHistoryState({ kind: "loaded", analyses });
        }
      })
      .catch((error) => {
        if (isMounted) {
          setHistoryState({ kind: "error", message: getHistoryErrorMessage(error) });
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleDelete(analysis: AnalysisHistorySummary) {
    const confirmed = window.confirm(
      `Delete saved analysis for ${analysis.filename}? This removes the local history record.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingAnalysisId(analysis.analysis_id);
    setDeleteError(null);

    try {
      await deleteAnalysis(analysis.analysis_id);
      setHistoryState((currentState) => {
        if (currentState.kind !== "loaded") {
          return currentState;
        }

        return {
          kind: "loaded",
          analyses: currentState.analyses.filter(
            (item) => item.analysis_id !== analysis.analysis_id,
          ),
        };
      });
    } catch (error) {
      const requestError = error as AnalysisHistoryRequestError;
      setDeleteError(
        requestError.message === "Analysis record was not found."
          ? "The selected analysis record was not found. Refresh the history list and try again."
          : "The selected analysis could not be deleted. Check the backend connection and try again.",
      );
    } finally {
      setDeletingAnalysisId(null);
    }
  }

  const loadedAnalyses = historyState.kind === "loaded" ? historyState.analyses : [];

  return (
    <section className="page-shell" aria-labelledby="history-title">
      <header className="page-header">
        <p className="eyebrow">Analysis History</p>
        <h1 id="history-title">Saved resume analyses</h1>
        <p>
          Review locally stored analysis summaries from this development environment. These records
          are local demo persistence, not authenticated user history.
        </p>
        <div className="page-actions">
          <Link className="button-link" to="/upload">
            Upload CV
          </Link>
          <button className="secondary-action" type="button" onClick={() => void loadHistory()}>
            Refresh history
          </button>
        </div>
      </header>

      <section className="history-summary-strip" aria-label="History summary">
        <div>
          <span>{historyState.kind === "loaded" ? loadedAnalyses.length : 0}</span>
          <p>records shown</p>
        </div>
        <p>
          Showing the first {HISTORY_PAGE_LIMIT} local records. Full pagination and result display
          are planned for future contracts.
        </p>
      </section>

      {historyState.kind === "loading" ? (
        <section className="history-state-panel" aria-live="polite" aria-busy="true">
          <p className="eyebrow">Loading</p>
          <h2>Loading saved analyses</h2>
          <p>CareerBoost AI is reading locally stored analysis summaries.</p>
        </section>
      ) : null}

      {historyState.kind === "error" ? (
        <section className="history-error-panel" role="alert" aria-labelledby="history-error-title">
          <div>
            <p className="eyebrow">History Error</p>
            <h2 id="history-error-title">History could not be loaded</h2>
          </div>
          <p>{historyState.message}</p>
          <button className="upload-error-action" type="button" onClick={() => void loadHistory()}>
            Retry loading history
          </button>
        </section>
      ) : null}

      {historyState.kind === "loaded" && loadedAnalyses.length === 0 ? (
        <section className="empty-state-panel" aria-labelledby="history-empty-title">
          <div className="empty-state-illustration" aria-hidden="true" />
          <div>
            <h2 id="history-empty-title">No saved analyses yet</h2>
            <p>Upload and analyze a resume to create your first history record.</p>
            <div className="page-actions">
              <Link className="button-link" to="/upload">
                Upload CV
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {historyState.kind === "loaded" && loadedAnalyses.length > 0 ? (
        <section className="history-list-section" aria-labelledby="history-list-title">
          <div className="dashboard-section-header">
            <p className="eyebrow">Stored Analyses</p>
            <h2 id="history-list-title">Analysis summaries</h2>
          </div>

          {deleteError ? (
            <div className="history-inline-error" role="alert">
              {deleteError}
            </div>
          ) : null}

          <ul className="history-card-list" aria-label="Saved analysis summaries">
            {loadedAnalyses.map((analysis) => (
              <li key={analysis.analysis_id}>
                <div className="history-card-header">
                  <div>
                    <h3>{analysis.filename}</h3>
                    <p>{formatHistoryDate(analysis.created_at)}</p>
                  </div>
                  <code>{formatCompactAnalysisId(analysis.analysis_id)}</code>
                </div>

                <dl className="history-metadata-grid">
                  <div>
                    <dt>Target role</dt>
                    <dd>{analysis.target_role || "Not provided"}</dd>
                  </div>
                  <div>
                    <dt>Target criteria</dt>
                    <dd>{formatStatusLabel(analysis.target_criteria_status)}</dd>
                  </div>
                  <div>
                    <dt>Target alignment</dt>
                    <dd>{formatStatusLabel(analysis.target_alignment_status)}</dd>
                  </div>
                  <div>
                    <dt>Detected sections</dt>
                    <dd>{analysis.detected_section_count}</dd>
                  </div>
                  <div>
                    <dt>Skill signals</dt>
                    <dd>{analysis.skill_signal_count}</dd>
                  </div>
                  <div>
                    <dt>Role profiles</dt>
                    <dd>{analysis.role_profile_count}</dd>
                  </div>
                </dl>

                <div className="history-card-actions">
                  <Link className="secondary-link" to={`/results/${analysis.analysis_id}`}>
                    Open result
                  </Link>
                  <button
                    className="danger-action"
                    type="button"
                    disabled={deletingAnalysisId === analysis.analysis_id}
                    onClick={() => void handleDelete(analysis)}
                  >
                    {deletingAnalysisId === analysis.analysis_id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
}
