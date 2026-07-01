import { frontendConfig } from "../config/environment";
import type { ResumeUploadError, ResumeUploadResponse } from "../types/resumeUpload";

export async function uploadResume(file: File): Promise<ResumeUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${frontendConfig.apiBaseUrl}/resumes/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = (await response.json()) as ResumeUploadError;
    throw new Error(error.detail || "Resume upload failed.");
  }

  return response.json() as Promise<ResumeUploadResponse>;
}
