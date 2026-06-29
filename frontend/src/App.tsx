import "./styles.css";

import { SystemStatus } from "./components/SystemStatus";

export function App() {
  return (
    <main className="app-shell">
      <section className="app-panel" aria-labelledby="app-title">
        <p className="eyebrow">CareerBoost AI</p>
        <h1 id="app-title">Engineering foundation is running.</h1>
        <p>
          Sprint 1 establishes the application shell, tooling, validation, and runtime foundation
          before product features are implemented.
        </p>
        <SystemStatus />
      </section>
    </main>
  );
}
