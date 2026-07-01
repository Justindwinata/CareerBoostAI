import { FormEvent, useState } from "react";

import { uploadResume } from "../services/resumeUploadService";
import type { ResumeUploadResponse } from "../types/resumeUpload";

const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;

type UploadState =
  | { kind: "idle" }
  | { kind: "selected"; file: File }
  | { kind: "submitting"; file: File }
  | { kind: "success"; result: ResumeUploadResponse }
  | { kind: "error"; message: string };

function validateSelectedFile(file: File): string | null {
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return "Resume must be a PDF file.";
  }

  if (file.size === 0) {
    return "Resume file cannot be empty.";
  }

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    return "Resume file must be 5 MB or smaller.";
  }

  return null;
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
      setUploadState({ kind: "success", result });
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
          This foundation step validates the file only. Resume analysis, ATS scoring, and
          recommendations are intentionally not started yet.
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
        <p className="upload-message upload-message--success" role="status">
          {uploadState.result.message}
        </p>
      ) : null}

      {uploadState.kind === "error" ? (
        <p className="upload-message upload-message--error" role="alert">
          {uploadState.message}
        </p>
      ) : null}
    </section>
  );
}
