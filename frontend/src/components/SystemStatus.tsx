import { useEffect, useState } from "react";

import { getHealthStatus } from "../services/healthService";
import type { HealthStatus } from "../types/health";

type StatusState =
  { kind: "loading" } | { kind: "ready"; health: HealthStatus } | { kind: "unavailable" };

export function SystemStatus() {
  const [status, setStatus] = useState<StatusState>({ kind: "loading" });

  useEffect(() => {
    let isMounted = true;

    getHealthStatus()
      .then((health) => {
        if (isMounted) {
          setStatus({ kind: "ready", health });
        }
      })
      .catch(() => {
        if (isMounted) {
          setStatus({ kind: "unavailable" });
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (status.kind === "loading") {
    return (
      <aside className="status-panel" aria-live="polite">
        <span className="status-dot status-dot--loading" />
        Checking backend health
      </aside>
    );
  }

  if (status.kind === "unavailable") {
    return (
      <aside className="status-panel status-panel--warning" aria-live="polite">
        <span className="status-dot status-dot--warning" />
        Backend health unavailable
      </aside>
    );
  }

  return (
    <aside className="status-panel" aria-live="polite">
      <span className="status-dot status-dot--ready" />
      {status.health.service} is healthy in {status.health.environment}
    </aside>
  );
}
