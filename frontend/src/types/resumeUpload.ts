export type AnalysisErrorCategory =
  | "empty_upload"
  | "encrypted_pdf"
  | "extraction_error"
  | "file_too_large"
  | "invalid_file_type"
  | "invalid_pdf"
  | "low_text"
  | "unreadable_pdf"
  | "validation_error";

export type ResumeIntakeResult = {
  status: "accepted";
  filename: string;
  content_type: "application/pdf";
  size_bytes: number;
};

export type AnalysisError = {
  category: AnalysisErrorCategory;
  message: string;
};

export type ResumeSectionName = "summary" | "skills" | "experience" | "education" | "projects";

export type DetectedResumeSection = {
  name: ResumeSectionName;
  heading: string;
  start_line: number;
  end_line: number;
  content: string;
};

export type SuccessfulResumeExtractionResult = {
  status: "extracted";
  confidence: "medium" | "high";
  character_count: number;
  page_count: number;
  extracted_text: string;
  normalized_text: string;
  sections: DetectedResumeSection[];
  error: null;
};

export type FailedResumeExtractionResult = {
  status: "failed";
  confidence: null;
  character_count: number;
  page_count: number;
  extracted_text: null;
  normalized_text: null;
  sections: [];
  error: AnalysisError;
};

export type ResumeExtractionResult =
  SuccessfulResumeExtractionResult | FailedResumeExtractionResult;

export type AnalysisStagePlaceholder = {
  status: "not_started";
  name: "ats" | "skills" | "roles" | "recommendations";
  label: string;
};

export type ResumeUploadResponse = {
  status: "intake_completed" | "failed";
  intake: ResumeIntakeResult;
  extraction: ResumeExtractionResult;
  ats: AnalysisStagePlaceholder;
  skills: AnalysisStagePlaceholder;
  roles: AnalysisStagePlaceholder;
  recommendations: AnalysisStagePlaceholder;
};

export type ResumeUploadError = {
  detail?: string;
};

export type ResumeUploadResult = ResumeUploadResponse & {
  uploaded_at: string;
};
