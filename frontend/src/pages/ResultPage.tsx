import { Link, useParams } from "react-router-dom";

export function ResultPage() {
  const { analysisId } = useParams();

  return (
    <section className="page-shell" aria-labelledby="result-title">
      <header className="page-header">
        <p className="eyebrow">Analysis Result</p>
        <h1 id="result-title">Analysis result unavailable.</h1>
        <p>
          Persisted result retrieval is not implemented yet, so CareerBoost AI cannot load saved
          analysis records from this route.
        </p>
      </header>

      <section className="empty-state-panel" aria-labelledby="result-unavailable-title">
        <div className="empty-state-illustration" aria-hidden="true" />
        <div>
          <h2 id="result-unavailable-title">No persisted result was found</h2>
          <p>
            Requested analysis identifier: <code>{analysisId ?? "unavailable"}</code>
          </p>
          <div className="page-actions">
            <Link className="button-link" to="/upload">
              Upload CV
            </Link>
            <Link className="secondary-link" to="/history">
              View History
            </Link>
          </div>
        </div>
      </section>
    </section>
  );
}
