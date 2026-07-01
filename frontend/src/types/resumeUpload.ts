export type ResumeExtractionResult = {
  status: "extracted";
  confidence: "medium" | "high";
  character_count: number;
  page_count: number;
  extracted_text: string;
};

export type ResumeUploadResponse = {
  status: "accepted";
  filename: string;
  content_type: string;
  size_bytes: number;
  message: string;
  extraction: ResumeExtractionResult;
};

export type ResumeUploadError = {
  detail: string;
};

export type ResumeUploadResult = ResumeUploadResponse & {
  uploaded_at: string;
};
