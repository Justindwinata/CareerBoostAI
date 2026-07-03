import { Link } from "react-router-dom";

export function HistoryPage() {
  return (
    <section className="page-shell" aria-labelledby="history-title">
      <header className="page-header">
        <p className="eyebrow">Analysis History</p>
        <h1 id="history-title">Saved analysis history is not available yet.</h1>
        <p>
          CareerBoost AI currently returns analysis metadata for the active upload session only.
          Persistence, searchable records, report downloads, reanalysis, and deletion workflows are
          planned for future contracts.
        </p>
      </header>

      <section className="empty-state-panel" aria-labelledby="history-empty-title">
        <div className="empty-state-illustration" aria-hidden="true" />
        <div>
          <h2 id="history-empty-title">No saved analyses yet</h2>
          <p>Analyses are not currently persisted in this local version.</p>
          <div className="page-actions">
            <Link className="button-link" to="/upload">
              Upload CV
            </Link>
          </div>
        </div>
      </section>
    </section>
  );
}
