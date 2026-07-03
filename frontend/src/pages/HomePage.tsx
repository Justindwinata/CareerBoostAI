import { Link } from "react-router-dom";

const capabilities = [
  "PDF validation",
  "Text extraction",
  "Resume section detection",
  "Completeness metadata",
  "ATS structure feedback",
  "Explicit skill signals",
  "Deterministic role matching",
  "Accessible analysis dashboard",
];

const workflowSteps = ["Upload", "Validate", "Extract", "Analyze", "Review Results"];

export function HomePage() {
  return (
    <section className="page-shell" aria-labelledby="home-title">
      <header className="hero-panel">
        <p className="eyebrow">CareerBoost AI</p>
        <h1 id="home-title">Review resume evidence before an application.</h1>
        <p>
          CareerBoost AI provides deterministic resume analysis and role-alignment metadata for
          internship preparation. Current results are based on explicit document signals, not AI
          predictions or hiring guarantees.
        </p>
        <div className="page-actions">
          <Link className="button-link" to="/upload">
            Analyze a Resume
          </Link>
          <a className="secondary-link" href="#current-capabilities">
            View capabilities
          </a>
        </div>
      </header>

      <section
        className="dashboard-section"
        id="current-capabilities"
        aria-labelledby="capabilities-title"
      >
        <div className="dashboard-section-header">
          <p className="eyebrow">Current Capabilities</p>
          <h2 id="capabilities-title">Implemented deterministic workflow</h2>
        </div>
        <ul className="capability-grid" aria-label="Implemented deterministic capabilities">
          {capabilities.map((capability) => (
            <li key={capability}>{capability}</li>
          ))}
        </ul>
      </section>

      <section className="dashboard-section" aria-labelledby="workflow-title">
        <div className="dashboard-section-header">
          <p className="eyebrow">Workflow</p>
          <h2 id="workflow-title">Resume analysis flow</h2>
        </div>
        <ol className="workflow-list" aria-label="Resume analysis workflow">
          {workflowSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>

      <section className="empty-state-panel" aria-labelledby="recent-activity-title">
        <div className="empty-state-illustration" aria-hidden="true" />
        <div>
          <p className="eyebrow">Recent Activity</p>
          <h2 id="recent-activity-title">No saved analyses yet</h2>
          <p>History storage will be introduced in a future update.</p>
        </div>
      </section>
    </section>
  );
}
