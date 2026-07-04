import { FormEvent, useEffect, useRef, useState } from "react";

import {
  ResumeUploadRequestError,
  uploadResume,
  type ResumeUploadFailureCategory,
} from "../services/resumeUploadService";
import { AnalysisDashboard } from "./AnalysisDashboard";
import { TargetCriteriaPanel } from "./TargetCriteriaPanel";
import {
  buildTargetCriteriaInput,
  createDefaultTargetCriteriaFormValue,
  getTargetCriteriaValidationErrors,
  hasTargetCriteriaValidationErrors,
  type TargetCriteriaFormValue,
  type TargetCriteriaValidationErrors,
} from "./targetCriteriaForm";
import type { TargetCriteriaInput, ResumeUploadResult } from "../types/resumeUpload";

const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;
const PROCESSING_STAGES = [
  "Uploading resume",
  "Validating document",
  "Extracting text",
  "Preparing analysis metadata",
  "Rendering results",
];

type UploadState =
  | { kind: "idle" }
  | { kind: "selected"; file: File }
  | { kind: "submitting"; file: File }
  | { kind: "success"; result: ResumeUploadResult }
  | { kind: "error"; error: UploadErrorPresentation; file: File | null };

type UploadErrorCategory = ResumeUploadFailureCategory | "no_file_selected";

type UploadErrorPresentation = {
  category: UploadErrorCategory;
  title: string;
  explanation: string;
  recoveryInstruction: string;
  actionLabel: string;
  canRetryWithCurrentFile: boolean;
};

const ERROR_PRESENTATIONS: Record<UploadErrorCategory, UploadErrorPresentation> = {
  no_file_selected: {
    category: "no_file_selected",
    title: "No file selected",
    explanation: "Choose a PDF resume before starting the upload workflow.",
    recoveryInstruction: "Select a PDF file from your device.",
    actionLabel: "Choose a PDF file",
    canRetryWithCurrentFile: false,
  },
  unsupported_file_type: {
    category: "unsupported_file_type",
    title: "Unsupported file type",
    explanation: "CareerBoost AI currently accepts PDF resume files only.",
    recoveryInstruction: "Choose a PDF file.",
    actionLabel: "Choose a PDF file",
    canRetryWithCurrentFile: false,
  },
  file_too_large: {
    category: "file_too_large",
    title: "File is too large",
    explanation: "The selected resume is larger than the current 5 MB upload limit.",
    recoveryInstruction: "Keep the file below the current size limit.",
    actionLabel: "Choose a smaller PDF",
    canRetryWithCurrentFile: false,
  },
  empty_file: {
    category: "empty_file",
    title: "File is empty",
    explanation: "The selected file does not contain uploadable resume content.",
    recoveryInstruction: "Choose a PDF resume that contains content.",
    actionLabel: "Choose another PDF",
    canRetryWithCurrentFile: false,
  },
  invalid_pdf: {
    category: "invalid_pdf",
    title: "Invalid PDF",
    explanation: "The selected file could not be read as a valid PDF document.",
    recoveryInstruction: "Export the resume as a fresh searchable PDF.",
    actionLabel: "Choose a valid PDF",
    canRetryWithCurrentFile: false,
  },
  password_protected_pdf: {
    category: "password_protected_pdf",
    title: "Password-protected PDF",
    explanation: "Password-protected PDFs cannot be processed in the current upload workflow.",
    recoveryInstruction: "Remove the PDF password before uploading.",
    actionLabel: "Choose an unlocked PDF",
    canRetryWithCurrentFile: false,
  },
  unreadable_pdf: {
    category: "unreadable_pdf",
    title: "Unreadable PDF",
    explanation: "Readable resume text could not be extracted from this PDF.",
    recoveryInstruction: "Export the resume as a searchable PDF.",
    actionLabel: "Choose a searchable PDF",
    canRetryWithCurrentFile: false,
  },
  insufficient_text: {
    category: "insufficient_text",
    title: "Insufficient resume text",
    explanation: "The PDF does not contain enough readable text for deterministic processing.",
    recoveryInstruction: "Upload a text-based resume PDF instead of a scanned or blank file.",
    actionLabel: "Choose a text-based PDF",
    canRetryWithCurrentFile: false,
  },
  network_unavailable: {
    category: "network_unavailable",
    title: "Backend connection unavailable",
    explanation: "The upload request could not reach the CareerBoost AI backend.",
    recoveryInstruction: "Check the backend connection and try again.",
    actionLabel: "Retry upload",
    canRetryWithCurrentFile: true,
  },
  unexpected_error: {
    category: "unexpected_error",
    title: "Upload could not be completed",
    explanation: "The upload request ended before CareerBoost AI could process the resume.",
    recoveryInstruction:
      "Try again with the selected PDF, or choose a new PDF if the issue repeats.",
    actionLabel: "Retry upload",
    canRetryWithCurrentFile: true,
  },
};

function getErrorPresentation(category: UploadErrorCategory): UploadErrorPresentation {
  return ERROR_PRESENTATIONS[category];
}

function getErrorCategory(error: unknown): ResumeUploadFailureCategory {
  if (error instanceof ResumeUploadRequestError) {
    return error.category;
  }

  if (error instanceof TypeError) {
    return "network_unavailable";
  }

  return "unexpected_error";
}

function validateSelectedFile(file: File): ResumeUploadFailureCategory | null {
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return "unsupported_file_type";
  }

  if (file.size === 0) {
    return "empty_file";
  }

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    return "file_too_large";
  }

  return null;
}

export function ResumeUploadForm() {
  const [uploadState, setUploadState] = useState<UploadState>({ kind: "idle" });
  const [targetCriteriaForm, setTargetCriteriaForm] = useState<TargetCriteriaFormValue>(
    createDefaultTargetCriteriaFormValue,
  );
  const [targetCriteriaErrors, setTargetCriteriaErrors] = useState<TargetCriteriaValidationErrors>(
    {},
  );
  const errorPanelRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const analysisSummaryRef = useRef<HTMLElement>(null);
  const isProcessing = uploadState.kind === "submitting";

  const selectedFile =
    uploadState.kind === "selected" ||
    uploadState.kind === "submitting" ||
    (uploadState.kind === "error" && uploadState.file)
      ? uploadState.file
      : null;

  useEffect(() => {
    if (uploadState.kind === "error") {
      errorPanelRef.current?.focus();
    }

    if (uploadState.kind === "success") {
      analysisSummaryRef.current?.focus();
    }
  }, [uploadState]);

  function handleFileChange(file: File | undefined) {
    if (!file) {
      setUploadState({ kind: "idle" });
      return;
    }

    const validationError = validateSelectedFile(file);

    if (validationError) {
      fileInputRef.current?.focus();
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setUploadState({ kind: "error", error: getErrorPresentation(validationError), file: null });
      return;
    }

    setUploadState({ kind: "selected", file });
  }

  function validateTargetCriteria(): TargetCriteriaInput | null | undefined {
    const nextErrors = getTargetCriteriaValidationErrors(targetCriteriaForm);
    setTargetCriteriaErrors(nextErrors);

    if (hasTargetCriteriaValidationErrors(nextErrors)) {
      return undefined;
    }

    return buildTargetCriteriaInput(targetCriteriaForm);
  }

  function handleTargetCriteriaChange(nextValue: TargetCriteriaFormValue) {
    setTargetCriteriaForm(nextValue);

    if (hasTargetCriteriaValidationErrors(targetCriteriaErrors)) {
      setTargetCriteriaErrors(getTargetCriteriaValidationErrors(nextValue));
    }
  }

  async function submitResume(file: File, targetCriteria: TargetCriteriaInput | null) {
    setUploadState({ kind: "submitting", file });

    try {
      const result = await uploadResume(file, targetCriteria);
      setUploadState({
        kind: "success",
        result: {
          ...result,
          uploaded_at: new Date().toISOString(),
        },
      });
    } catch (error) {
      const errorPresentation = getErrorPresentation(getErrorCategory(error));
      const fileForRetry = errorPresentation.canRetryWithCurrentFile ? file : null;

      if (!fileForRetry && fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setUploadState({
        kind: "error",
        error: errorPresentation,
        file: fileForRetry,
      });
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isProcessing) {
      return;
    }

    if (!selectedFile) {
      setUploadState({
        kind: "error",
        error: getErrorPresentation("no_file_selected"),
        file: null,
      });
      return;
    }

    const targetCriteria = validateTargetCriteria();

    if (targetCriteria === undefined) {
      return;
    }

    void submitResume(selectedFile, targetCriteria);
  }

  function handleRetry() {
    if (isProcessing || uploadState.kind !== "error" || !uploadState.file) {
      fileInputRef.current?.focus();
      return;
    }

    const targetCriteria = validateTargetCriteria();

    if (targetCriteria === undefined) {
      return;
    }

    void submitResume(uploadState.file, targetCriteria);
  }

  return (
    <div className="resume-workflow">
      <TargetCriteriaPanel
        value={targetCriteriaForm}
        errors={targetCriteriaErrors}
        disabled={isProcessing}
        onChange={handleTargetCriteriaChange}
      />

      <section className="upload-panel" aria-labelledby="upload-title">
        <div>
          <p className="eyebrow">Resume Upload</p>
          <h2 id="upload-title">Upload a PDF resume</h2>
          <p id="upload-description">
            This foundation step validates the file and extracts readable text. Resume analysis, ATS
            evaluation, and recommendations are intentionally limited to deterministic metadata.
          </p>
        </div>

        <form
          className="upload-form"
          aria-label="Resume upload form"
          aria-busy={isProcessing}
          aria-describedby="upload-description"
          onSubmit={handleSubmit}
        >
          <label className="file-label" htmlFor="resume-file">
            Select PDF resume
          </label>
          <p id="resume-file-help" className="file-help">
            PDF only. Maximum file size is 5 MB.
          </p>
          <input
            ref={fileInputRef}
            id="resume-file"
            name="resume-file"
            type="file"
            accept="application/pdf,.pdf"
            aria-describedby="resume-file-help"
            disabled={isProcessing}
            onChange={(event) => handleFileChange(event.target.files?.[0])}
          />

          {selectedFile ? (
            <p className="file-summary">
              Selected: <strong>{selectedFile.name}</strong>
            </p>
          ) : null}

          <button type="submit" disabled={uploadState.kind === "submitting"}>
            {isProcessing ? "Processing resume..." : "Upload resume"}
          </button>
        </form>

        {isProcessing ? (
          <section className="processing-panel" aria-labelledby="processing-title" aria-busy="true">
            <div className="processing-panel-header">
              <div className="loading-indicator" aria-hidden="true" />
              <div>
                <p className="eyebrow">Processing Resume</p>
                <h3 id="processing-title">Processing document metadata</h3>
              </div>
            </div>

            <p className="processing-live-status" role="status" aria-live="polite">
              Resume processing is in progress. Keep this page open while the request completes.
            </p>

            <ol className="processing-stage-list" aria-label="Expected processing workflow">
              {PROCESSING_STAGES.map((stageName) => (
                <li key={stageName}>{stageName}</li>
              ))}
            </ol>
          </section>
        ) : null}

        {uploadState.kind === "success" ? (
          <AnalysisDashboard
            ref={analysisSummaryRef}
            result={uploadState.result}
            uploadedAt={uploadState.result.uploaded_at}
          />
        ) : null}

        {uploadState.kind === "error" ? (
          <div
            ref={errorPanelRef}
            className="upload-error-panel"
            role="alert"
            aria-live="assertive"
            aria-labelledby="upload-error-title"
            tabIndex={-1}
          >
            <div>
              <p className="eyebrow">Upload Error</p>
              <h3 id="upload-error-title">{uploadState.error.title}</h3>
            </div>

            <p>{uploadState.error.explanation}</p>

            <dl className="upload-error-details">
              <div>
                <dt>Recovery</dt>
                <dd>{uploadState.error.recoveryInstruction}</dd>
              </div>
              <div>
                <dt>Selected file</dt>
                <dd>
                  {uploadState.file
                    ? `${uploadState.file.name} can be retried.`
                    : "Choose a replacement file before submitting again."}
                </dd>
              </div>
            </dl>

            <button className="upload-error-action" type="button" onClick={handleRetry}>
              {uploadState.file ? uploadState.error.actionLabel : "Choose replacement file"}
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
