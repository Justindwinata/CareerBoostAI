import { frontendConfig } from "../config/environment";
import type { ResumeUploadError, ResumeUploadResponse } from "../types/resumeUpload";

const ERROR_MESSAGES: Record<string, string> = {
  "Resume must use a .pdf file extension.":
    "Upload a PDF resume file. Other file types are not supported yet.",
  "Resume must be uploaded as a PDF file.":
    "Upload a PDF resume file. Other file types are not supported yet.",
  "Resume file is not a valid PDF.":
    "This file could not be read as a valid PDF. Export your resume as a new PDF and try again.",
  "Password-protected PDFs are not supported.":
    "Remove the PDF password protection and upload the resume again.",
  "Resume file must be 5 MB or smaller.":
    "Your resume is larger than 5 MB. Compress the PDF and try again.",
  "Resume file cannot be empty.":
    "The selected file is empty. Choose a PDF resume that contains content.",
};

function getUploadErrorMessage(detail: string | undefined): string {
  if (!detail) {
    return "Resume upload failed. Check the file and try again.";
  }

  return ERROR_MESSAGES[detail] ?? detail;
}

export async function uploadResume(file: File): Promise<ResumeUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${frontendConfig.apiBaseUrl}/resumes/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = (await response.json()) as ResumeUploadError;
    throw new Error(getUploadErrorMessage(error.detail));
  }

  return response.json() as Promise<ResumeUploadResponse>;
}
