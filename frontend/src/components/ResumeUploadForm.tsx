import { FormEvent, useState } from "react";

import { uploadResume } from "../services/resumeUploadService";
import type { ResumeUploadResult } from "../types/resumeUpload";

const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;

type UploadState =
  | { kind: "idle" }
  | { kind: "selected"; file: File }
  | { kind: "submitting"; file: File }
  | { kind: "success"; result: ResumeUploadResult }
  | { kind: "error"; message: string };

function validateSelectedFile(file: File): string | null {
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return "Upload a PDF resume file. Other file types are not supported yet.";
  }

  if (file.size === 0) {
    return "The selected file is empty. Choose a PDF resume that contains content.";
  }

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    return "Your resume is larger than 5 MB. Compress the PDF and try again.";
  }

  return null;
}

function formatFileSize(sizeBytes: number): string {
  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatUploadTimestamp(timestamp: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function formatConfidence(confidence: ResumeUploadResult["extraction"]["confidence"]): string {
  return confidence === "high" ? "High confidence" : "Medium confidence";
}

export function ResumeUploadForm() {
  const [uploadState, setUploadState] = useState<UploadState>({ kind: "idle" });

  const selectedFile =
    uploadState.kind === "selected" || uploadState.kind === "submitting" ? uploadState.file : null;

  function handleFileChange(file: File | undefined) {
    if (!file) {
      setUploadState({ kind: "idle" });
      return;
    }

    const validationError = validateSelectedFile(file);

    if (validationError) {
      setUploadState({ kind: "error", message: validationError });
      return;
    }

    setUploadState({ kind: "selected", file });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFile) {
      setUploadState({ kind: "error", message: "Select a PDF resume before uploading." });
      return;
    }

    setUploadState({ kind: "submitting", file: selectedFile });

    try {
      const result = await uploadResume(selectedFile);
      setUploadState({
        kind: "success",
        result: {
          ...result,
          uploaded_at: new Date().toISOString(),
        },
      });
    } catch (error) {
      setUploadState({
        kind: "error",
        message: error instanceof Error ? error.message : "Resume upload failed.",
      });
    }
  }

  return (
    <section className="upload-panel" aria-labelledby="upload-title">
      <div>
        <p className="eyebrow">Resume Upload</p>
        <h2 id="upload-title">Upload a PDF resume</h2>
        <p>
          This foundation step validates the file and extracts readable text. Resume analysis, ATS
          scoring, and recommendations are intentionally not started yet.
        </p>
      </div>

      <form className="upload-form" onSubmit={handleSubmit}>
        <label className="file-label" htmlFor="resume-file">
          Select PDF resume
        </label>
        <input
          id="resume-file"
          name="resume-file"
          type="file"
          accept="application/pdf,.pdf"
          onChange={(event) => handleFileChange(event.target.files?.[0])}
        />

        {selectedFile ? (
          <p className="file-summary">
            Selected: <strong>{selectedFile.name}</strong>
          </p>
        ) : null}

        <button type="submit" disabled={uploadState.kind === "submitting"}>
          {uploadState.kind === "submitting" ? "Uploading..." : "Upload resume"}
        </button>
      </form>

      {uploadState.kind === "success" ? (
        <section className="upload-result-panel" aria-labelledby="upload-result-title">
          <div>
            <p className="eyebrow">Extraction Complete</p>
            <h3 id="upload-result-title">Resume upload accepted</h3>
          </div>
          <dl className="upload-result-list">
            <div>
              <dt>Filename</dt>
              <dd>{uploadState.result.filename}</dd>
            </div>
            <div>
              <dt>File size</dt>
              <dd>{formatFileSize(uploadState.result.size_bytes)}</dd>
            </div>
            <div>
              <dt>Upload timestamp</dt>
              <dd>{formatUploadTimestamp(uploadState.result.uploaded_at)}</dd>
            </div>
            <div>
              <dt>Validation status</dt>
              <dd>Accepted PDF resume</dd>
            </div>
            <div>
              <dt>Extraction status</dt>
              <dd>Text extraction complete</dd>
            </div>
            <div>
              <dt>Extraction confidence</dt>
              <dd>{formatConfidence(uploadState.result.extraction.confidence)}</dd>
            </div>
            <div>
              <dt>Extracted text</dt>
              <dd>{uploadState.result.extraction.character_count} readable characters</dd>
            </div>
            <div>
              <dt>Pages processed</dt>
              <dd>{uploadState.result.extraction.page_count}</dd>
            </div>
            <div>
              <dt>Next step</dt>
              <dd>Ready for analysis workflow</dd>
            </div>
          </dl>
        </section>
      ) : null}

      {uploadState.kind === "error" ? (
        <p className="upload-message upload-message--error" role="alert">
          {uploadState.message}
        </p>
      ) : null}
    </section>
  );
}
