import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <section className="page-shell" aria-labelledby="not-found-title">
      <header className="page-header">
        <p className="eyebrow">Page Not Found</p>
        <h1 id="not-found-title">This page is not available.</h1>
        <p>The requested route does not exist in the current CareerBoost AI application shell.</p>
      </header>

      <section className="empty-state-panel" aria-labelledby="not-found-actions-title">
        <div className="empty-state-illustration" aria-hidden="true" />
        <div>
          <h2 id="not-found-actions-title">Return to an available workflow</h2>
          <div className="page-actions">
            <Link className="button-link" to="/">
              Go Home
            </Link>
            <Link className="secondary-link" to="/upload">
              Upload CV
            </Link>
          </div>
        </div>
      </section>
    </section>
  );
}
