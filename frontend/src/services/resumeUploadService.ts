import { frontendConfig } from "../config/environment";
import type { ResumeUploadError, ResumeUploadResponse } from "../types/resumeUpload";

export type ResumeUploadFailureCategory =
  | "unsupported_file_type"
  | "file_too_large"
  | "empty_file"
  | "invalid_pdf"
  | "password_protected_pdf"
  | "unreadable_pdf"
  | "insufficient_text"
  | "network_unavailable"
  | "unexpected_error";

const API_ERROR_CATEGORIES: Record<string, ResumeUploadFailureCategory> = {
  "Resume must use a .pdf file extension.": "unsupported_file_type",
  "Resume must be uploaded as a PDF file.": "unsupported_file_type",
  "Resume file is not a valid PDF.": "invalid_pdf",
  "Password-protected PDFs are not supported.": "password_protected_pdf",
  "Resume file must be 5 MB or smaller.": "file_too_large",
  "Resume file cannot be empty.": "empty_file",
  "Resume text is too short to analyze. Upload a text-based PDF resume.": "insufficient_text",
  "Resume text could not be extracted from this PDF.": "unreadable_pdf",
};

export class ResumeUploadRequestError extends Error {
  readonly category: ResumeUploadFailureCategory;

  constructor(category: ResumeUploadFailureCategory) {
    super(category);
    this.name = "ResumeUploadRequestError";
    this.category = category;
  }
}

function getUploadErrorCategory(detail: string | undefined): ResumeUploadFailureCategory {
  if (!detail) {
    return "unexpected_error";
  }

  return API_ERROR_CATEGORIES[detail] ?? "unexpected_error";
}

function isStructuredAnalysisResponse(value: unknown): value is ResumeUploadResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "status" in value &&
    "intake" in value &&
    "extraction" in value
  );
}

export async function uploadResume(file: File): Promise<ResumeUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${frontendConfig.apiBaseUrl}/resumes/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let error: ResumeUploadError | ResumeUploadResponse | null = null;

    try {
      error = (await response.json()) as ResumeUploadError | ResumeUploadResponse;
    } catch {
      throw new ResumeUploadRequestError("unexpected_error");
    }

    if (isStructuredAnalysisResponse(error)) {
      throw new ResumeUploadRequestError(getUploadErrorCategory(error.extraction.error?.message));
    }

    throw new ResumeUploadRequestError(getUploadErrorCategory(error.detail));
  }

  return response.json() as Promise<ResumeUploadResponse>;
}
