import { frontendConfig } from "../config/environment";
import type { AnalysisHistorySummary, ResumeUploadResponse } from "../types/resumeUpload";

export class AnalysisHistoryRequestError extends Error {
  constructor(message = "analysis_history_request_failed") {
    super(message);
    this.name = "AnalysisHistoryRequestError";
  }
}

export class AnalysisNotFoundError extends Error {
  constructor(message = "Analysis record was not found.") {
    super(message);
    this.name = "AnalysisNotFoundError";
  }
}

async function parseErrorResponse(response: Response): Promise<never> {
  try {
    const payload = (await response.json()) as { detail?: string };
    if (response.status === 404) {
      throw new AnalysisNotFoundError(payload.detail);
    }

    throw new AnalysisHistoryRequestError(payload.detail ?? "analysis_history_request_failed");
  } catch (error) {
    if (error instanceof AnalysisHistoryRequestError || error instanceof AnalysisNotFoundError) {
      throw error;
    }

    throw new AnalysisHistoryRequestError();
  }
}

export async function listAnalysisHistory({
  limit = 20,
  offset = 0,
}: {
  limit?: number;
  offset?: number;
} = {}): Promise<AnalysisHistorySummary[]> {
  const searchParams = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  const response = await fetch(`${frontendConfig.apiBaseUrl}/analyses?${searchParams.toString()}`);

  if (!response.ok) {
    await parseErrorResponse(response);
  }

  return response.json() as Promise<AnalysisHistorySummary[]>;
}

export async function deleteAnalysis(analysisId: string): Promise<void> {
  const response = await fetch(`${frontendConfig.apiBaseUrl}/analyses/${analysisId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    await parseErrorResponse(response);
  }
}

export async function getAnalysisById(analysisId: string): Promise<ResumeUploadResponse> {
  const response = await fetch(`${frontendConfig.apiBaseUrl}/analyses/${analysisId}`);

  if (!response.ok) {
    await parseErrorResponse(response);
  }

  return response.json() as Promise<ResumeUploadResponse>;
}

export function getAnalysisReportUrl(analysisId: string): string {
  return `${frontendConfig.apiBaseUrl}/analyses/${encodeURIComponent(analysisId)}/report.html`;
}

export async function downloadAnalysisReport(analysisId: string): Promise<Blob> {
  const response = await fetch(getAnalysisReportUrl(analysisId));

  if (!response.ok) {
    await parseErrorResponse(response);
  }

  return response.blob();
}
