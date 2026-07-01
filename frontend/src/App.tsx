import "./styles.css";

import { ResumeUploadForm } from "./components/ResumeUploadForm";
import { SystemStatus } from "./components/SystemStatus";

export function App() {
  return (
    <main className="app-shell">
      <section className="app-panel" aria-labelledby="app-title">
        <p className="eyebrow">CareerBoost AI</p>
        <h1 id="app-title">Engineering foundation is running.</h1>
        <p>
          Upload a PDF resume to start the internship readiness workflow. This release validates the
          file only; analysis features come later.
        </p>
        <SystemStatus />
        <ResumeUploadForm />
      </section>
    </main>
  );
}
