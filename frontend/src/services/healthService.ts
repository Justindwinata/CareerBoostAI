import { frontendConfig } from "../config/environment";
import type { HealthStatus } from "../types/health";

export async function getHealthStatus(): Promise<HealthStatus> {
  const response = await fetch(`${frontendConfig.apiBaseUrl}/health`, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`);
  }

  return response.json() as Promise<HealthStatus>;
}
