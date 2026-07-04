import { Link } from "react-router-dom";

export function HistoryPage() {
  return (
    <section className="page-shell" aria-labelledby="history-title">
      <header className="page-header">
        <p className="eyebrow">Analysis History</p>
        <h1 id="history-title">Saved analysis history UI is not available yet.</h1>
        <p>
          CareerBoost AI now stores completed analyses locally through the backend history API.
          Searchable frontend records, report downloads, reanalysis, and deletion workflows are
          planned for future contracts.
        </p>
      </header>

      <section className="empty-state-panel" aria-labelledby="history-empty-title">
        <div className="empty-state-illustration" aria-hidden="true" />
        <div>
          <h2 id="history-empty-title">No saved analyses yet</h2>
          <p>The frontend is not connected to local analysis history yet.</p>
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
