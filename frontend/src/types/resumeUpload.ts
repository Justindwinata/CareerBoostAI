export type ResumeUploadResponse = {
  status: "accepted";
  filename: string;
  content_type: string;
  size_bytes: number;
  message: string;
};

export type ResumeUploadError = {
  detail: string;
};

export type ResumeUploadResult = ResumeUploadResponse & {
  uploaded_at: string;
};
