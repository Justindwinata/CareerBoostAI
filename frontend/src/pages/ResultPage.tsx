import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { AnalysisDashboard } from "../components/AnalysisDashboard";
import { AnalysisNotFoundError, getAnalysisById } from "../services/analysisHistoryService";
import type { ResumeUploadResponse } from "../types/resumeUpload";

type ResultPageState =
  | { kind: "loading"; analysisId: string }
  | { kind: "loaded"; analysisId: string; analysis: ResumeUploadResponse }
  | { kind: "not_found"; analysisId: string | null }
  | { kind: "error"; analysisId: string; message: string };

function formatCompactAnalysisId(analysisId: string): string {
  return `${analysisId.slice(0, 8)}...${analysisId.slice(-4)}`;
}

function getResultErrorMessage(error: unknown): string {
  if (error instanceof AnalysisNotFoundError) {
    return "not_found";
  }

  return "Saved analysis could not be loaded. Check the backend connection and try again.";
}

export function ResultPage() {
  const { analysisId } = useParams();
  const [resultState, setResultState] = useState<ResultPageState>(() =>
    analysisId ? { kind: "loading", analysisId } : { kind: "not_found", analysisId: null },
  );

  const loadResult = useCallback(async () => {
    if (!analysisId) {
      setResultState({ kind: "not_found", analysisId: null });
      return;
    }

    setResultState({ kind: "loading", analysisId });

    try {
      const analysis = await getAnalysisById(analysisId);
      setResultState({ kind: "loaded", analysisId, analysis });
    } catch (error) {
      const message = getResultErrorMessage(error);

      if (message === "not_found") {
        setResultState({ kind: "not_found", analysisId });
        return;
      }

      setResultState({ kind: "error", analysisId, message });
    }
  }, [analysisId]);

  useEffect(() => {
    let isMounted = true;

    if (!analysisId) {
      return undefined;
    }

    getAnalysisById(analysisId)
      .then((analysis) => {
        if (isMounted) {
          setResultState({ kind: "loaded", analysisId, analysis });
        }
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        const message = getResultErrorMessage(error);

        if (message === "not_found") {
          setResultState({ kind: "not_found", analysisId });
          return;
        }

        setResultState({ kind: "error", analysisId, message });
      });

    return () => {
      isMounted = false;
    };
  }, [analysisId]);

  const displayState =
    analysisId && resultState.analysisId !== analysisId
      ? ({ kind: "loading", analysisId } satisfies ResultPageState)
      : resultState;
  const loadedAnalysis = displayState.kind === "loaded" ? displayState.analysis : null;

  return (
    <section className="page-shell" aria-labelledby="result-title">
      <header className="page-header">
        <p className="eyebrow">Analysis Result</p>
        <h1 id="result-title">Analysis Result</h1>
        <p>
          View a locally stored deterministic analysis without uploading the resume again. This page
          does not provide report downloads, numeric scoring, AI interpretation, or acceptance
          outcomes.
        </p>
        <div className="page-actions">
          <Link className="secondary-link" to="/history">
            Back to History
          </Link>
          <Link className="button-link" to="/upload">
            Analyze Another Resume
          </Link>
        </div>
      </header>

      {loadedAnalysis ? (
        <section className="result-metadata-panel" aria-label="Stored result metadata">
          <dl className="metadata-summary-list">
            <div>
              <dt>Filename</dt>
              <dd>{loadedAnalysis.intake.filename}</dd>
            </div>
            <div>
              <dt>Created date</dt>
              <dd>Unavailable in stored detail response</dd>
            </div>
            <div>
              <dt>Analysis ID</dt>
              <dd>
                <code>
                  {formatCompactAnalysisId(loadedAnalysis.analysis_id ?? analysisId ?? "")}
                </code>
              </dd>
            </div>
          </dl>
        </section>
      ) : null}

      {displayState.kind === "loading" ? (
        <section className="history-state-panel" aria-live="polite" aria-busy="true">
          <p className="eyebrow">Loading</p>
          <h2>Loading saved analysis</h2>
          <p>CareerBoost AI is reading the stored deterministic analysis response.</p>
        </section>
      ) : null}

      {displayState.kind === "not_found" ? (
        <section className="empty-state-panel" aria-labelledby="result-not-found-title">
          <div className="empty-state-illustration" aria-hidden="true" />
          <div>
            <h2 id="result-not-found-title">Analysis not found</h2>
            <p>This saved analysis may have been deleted or the ID may be invalid.</p>
            <p>
              Requested analysis identifier: <code>{analysisId ?? "unavailable"}</code>
            </p>
            <div className="page-actions">
              <Link className="secondary-link" to="/history">
                Back to History
              </Link>
              <Link className="button-link" to="/upload">
                Upload CV
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {displayState.kind === "error" ? (
        <section className="history-error-panel" role="alert" aria-labelledby="result-error-title">
          <div>
            <p className="eyebrow">Result Error</p>
            <h2 id="result-error-title">Saved analysis could not be loaded</h2>
          </div>
          <p>{displayState.message}</p>
          <div className="page-actions">
            <button className="upload-error-action" type="button" onClick={() => void loadResult()}>
              Retry loading result
            </button>
            <Link className="secondary-link" to="/history">
              Back to History
            </Link>
          </div>
        </section>
      ) : null}

      {loadedAnalysis ? (
        <AnalysisDashboard
          result={loadedAnalysis}
          title="Stored analysis result"
          description="Deterministic intake metadata from the stored analysis response. No report download, numeric evaluation, ordered matches, or AI interpretation is applied."
          headingLevel="h2"
        />
      ) : null}
    </section>
  );
}
