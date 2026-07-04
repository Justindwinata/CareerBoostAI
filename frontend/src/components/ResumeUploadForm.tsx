import { FormEvent, useEffect, useRef, useState } from "react";

import {
  ResumeUploadRequestError,
  uploadResume,
  type ResumeUploadFailureCategory,
} from "../services/resumeUploadService";
import { TargetCriteriaPanel } from "./TargetCriteriaPanel";
import {
  buildTargetCriteriaInput,
  createDefaultTargetCriteriaFormValue,
  getTargetCriteriaValidationErrors,
  hasTargetCriteriaValidationErrors,
  type TargetCriteriaFormValue,
  type TargetCriteriaValidationErrors,
} from "./targetCriteriaForm";
import type {
  AtsFeedbackResult,
  ResumeSectionName,
  RoleMatchesResult,
  SkillSignalCategory,
  SkillSignalsResult,
  SkillSourceArea,
  TargetAlignmentResult,
  TargetAnalysisPriority,
  TargetCriteriaInput,
  TargetRequiredSectionName,
  ResumeUploadResult,
} from "../types/resumeUpload";

const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;
const EXTRACTED_TEXT_PREVIEW_LIMIT = 360;
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
  if (confidence === null) {
    return "Unavailable";
  }

  return confidence === "high" ? "High confidence" : "Medium confidence";
}

function formatSectionName(sectionName: ResumeSectionName): string {
  const sectionLabels: Record<ResumeSectionName, string> = {
    summary: "Summary",
    skills: "Skills",
    experience: "Experience",
    education: "Education",
    projects: "Projects",
  };

  return sectionLabels[sectionName];
}

function formatTargetSectionName(sectionName: TargetRequiredSectionName): string {
  if (sectionName === "certifications") {
    return "Certifications";
  }

  return formatSectionName(sectionName);
}

function formatAnalysisPriority(priority: TargetAnalysisPriority): string {
  const priorityLabels: Record<TargetAnalysisPriority, string> = {
    resume_structure: "Resume structure",
    ats_compatibility: "ATS compatibility",
    skill_visibility: "Skill visibility",
    role_alignment: "Role alignment",
    project_evidence: "Project evidence",
    education_fit: "Education fit",
  };

  return priorityLabels[priority];
}

function formatCompletenessRatio(completeness: NonNullable<ResumeUploadResult["completeness"]>) {
  const detectedCount = completeness.present_sections.length;
  const expectedCount = completeness.expected_sections.length;
  const percentage = Math.round(completeness.score * 100);

  return `${detectedCount} of ${expectedCount} expected sections detected (${percentage}%)`;
}

function formatLineRange(startLine: number, endLine: number): string {
  if (startLine === endLine) {
    return `Line ${startLine}`;
  }

  return `Lines ${startLine}-${endLine}`;
}

function formatAtsFeedbackStatus(status: AtsFeedbackResult["status"]): string {
  return status === "metadata_ready" ? "Metadata ready" : "Not evaluated";
}

function formatAtsIssueCategory(category: AtsFeedbackResult["issues"][number]["category"]): string {
  const categoryLabels: Record<AtsFeedbackResult["issues"][number]["category"], string> = {
    section_presence: "Section presence",
    section_structure: "Section structure",
    formatting_risk: "Formatting risk indicator",
    keyword_coverage_placeholder: "Keyword coverage placeholder",
    readability_structure: "Readability structure",
  };

  return categoryLabels[category];
}

function formatAtsScorePlaceholder(status: AtsFeedbackResult["score"]["status"]): string {
  return status === "not_scored" ? "Not scored" : "Unavailable";
}

function isAtsFeedbackResult(ats: ResumeUploadResult["ats"]): ats is AtsFeedbackResult {
  return ats.status === "metadata_ready" || ats.status === "not_evaluated";
}

function formatSkillSignalStatus(status: SkillSignalsResult["status"]): string {
  const statusLabels: Record<SkillSignalsResult["status"], string> = {
    signals_detected: "Signals detected",
    no_signals: "No signals",
    not_evaluated: "Not evaluated",
  };

  return statusLabels[status];
}

function formatSkillCategory(category: SkillSignalCategory): string {
  const categoryLabels: Record<SkillSignalCategory, string> = {
    programming_language: "Programming language",
    framework: "Framework",
    database: "Database",
    tooling: "Tooling",
    testing: "Testing",
    web_technology: "Web technology",
  };

  return categoryLabels[category];
}

function formatSkillSourceArea(sourceArea: SkillSourceArea): string {
  return sourceArea === "document" ? "Document" : formatSectionName(sourceArea);
}

function isSkillSignalsResult(skills: ResumeUploadResult["skills"]): skills is SkillSignalsResult {
  return (
    skills.status === "signals_detected" ||
    skills.status === "no_signals" ||
    skills.status === "not_evaluated"
  );
}

function formatRoleMatchStatus(status: RoleMatchesResult["candidates"][number]["match_status"]) {
  const statusLabels: Record<RoleMatchesResult["candidates"][number]["match_status"], string> = {
    matched: "Matched metadata",
    partial_match: "Partial metadata",
    not_matched: "No matched metadata",
    insufficient_data: "Insufficient data",
  };

  return statusLabels[status];
}

function formatRoleConfidenceState(
  confidenceState: RoleMatchesResult["candidates"][number]["confidence_state"],
) {
  const stateLabels: Record<RoleMatchesResult["candidates"][number]["confidence_state"], string> = {
    metadata_ready: "Metadata ready",
    insufficient_data: "Insufficient data",
    not_evaluated: "Not evaluated",
  };

  return stateLabels[confidenceState];
}

function isRoleMatchesResult(roles: ResumeUploadResult["roles"]): roles is RoleMatchesResult {
  return (
    roles.status === "metadata_ready" ||
    roles.status === "insufficient_data" ||
    roles.status === "not_evaluated"
  );
}

function formatTargetAlignmentStatus(status: TargetAlignmentResult["status"]): string {
  const statusLabels: Record<TargetAlignmentResult["status"], string> = {
    not_provided: "Not provided",
    evaluated: "Evaluated",
    insufficient_data: "Insufficient data",
  };

  return statusLabels[status];
}

function formatAlignmentItemStatus(status: string): string {
  const statusLabels: Record<string, string> = {
    found: "Found",
    not_found: "Not found",
    detected: "Detected",
    missing: "Missing",
    evaluated: "Evaluated",
    not_evaluated: "Not evaluated",
  };

  return statusLabels[status] ?? status;
}

function formatTargetRoleMappingStatus(
  status: TargetAlignmentResult["target_role"]["status"],
): string {
  const statusLabels: Record<TargetAlignmentResult["target_role"]["status"], string> = {
    not_provided: "Not provided",
    mapped_to_controlled_profile: "Mapped to controlled profile",
    not_mapped_to_controlled_profile: "Not mapped to controlled profile",
  };

  return statusLabels[status];
}

function formatMetadataAvailability(status: string): string {
  return status === "metadata_ready" || status === "signals_detected" ? "Available" : "Unavailable";
}

function getAnalysisSummaryItems(result: ResumeUploadResult) {
  const hasAtsMetadata = isAtsFeedbackResult(result.ats);
  const hasSkillMetadata = isSkillSignalsResult(result.skills);
  const hasRoleMetadata = isRoleMatchesResult(result.roles);
  let explicitSkillSignalCount: number | null = null;

  if (isSkillSignalsResult(result.skills)) {
    explicitSkillSignalCount = result.skills.signals.length;
  }

  const deterministicPipelineComplete =
    result.status === "intake_completed" &&
    result.extraction.status === "extracted" &&
    result.completeness !== null &&
    hasAtsMetadata &&
    hasSkillMetadata &&
    hasRoleMetadata;

  return [
    {
      label: "Upload status",
      value: result.intake.status === "accepted" ? "Accepted" : "Unavailable",
    },
    {
      label: "Extraction status",
      value: result.extraction.status === "extracted" ? "Extracted" : "Unavailable",
    },
    {
      label: "Completeness status",
      value: result.completeness ? "Available" : "Unavailable",
    },
    {
      label: "Application target",
      value: result.target_criteria.status === "provided" ? "Provided" : "Not provided",
    },
    {
      label: "Target alignment",
      value: formatTargetAlignmentStatus(result.target_alignment.status),
    },
    {
      label: "Detected sections",
      value: `${result.extraction.sections.length} detected`,
    },
    {
      label: "Explicit skill signals",
      value:
        explicitSkillSignalCount !== null ? `${explicitSkillSignalCount} detected` : "Unavailable",
    },
    {
      label: "ATS metadata status",
      value: hasAtsMetadata ? formatMetadataAvailability(result.ats.status) : "Unavailable",
    },
    {
      label: "Role matching status",
      value: hasRoleMetadata ? formatMetadataAvailability(result.roles.status) : "Unavailable",
    },
    {
      label: "Overall pipeline status",
      value: deterministicPipelineComplete
        ? "Deterministic pipeline complete"
        : "Deterministic pipeline incomplete",
    },
  ];
}

function getPreviewText(extractedText: string, isExpanded: boolean): string {
  if (isExpanded || extractedText.length <= EXTRACTED_TEXT_PREVIEW_LIMIT) {
    return extractedText;
  }

  return `${extractedText.slice(0, EXTRACTED_TEXT_PREVIEW_LIMIT).trimEnd()}...`;
}

export function ResumeUploadForm() {
  const [uploadState, setUploadState] = useState<UploadState>({ kind: "idle" });
  const [targetCriteriaForm, setTargetCriteriaForm] = useState<TargetCriteriaFormValue>(
    createDefaultTargetCriteriaFormValue,
  );
  const [targetCriteriaErrors, setTargetCriteriaErrors] = useState<TargetCriteriaValidationErrors>(
    {},
  );
  const [isTextPreviewExpanded, setIsTextPreviewExpanded] = useState(false);
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
      setIsTextPreviewExpanded(false);
      return;
    }

    const validationError = validateSelectedFile(file);

    if (validationError) {
      fileInputRef.current?.focus();
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setUploadState({ kind: "error", error: getErrorPresentation(validationError), file: null });
      setIsTextPreviewExpanded(false);
      return;
    }

    setUploadState({ kind: "selected", file });
    setIsTextPreviewExpanded(false);
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
      setIsTextPreviewExpanded(false);
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
      setIsTextPreviewExpanded(false);
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
          <section className="upload-result-panel" aria-labelledby="upload-result-title">
            <div className="analysis-dashboard-header">
              <div>
                <p className="eyebrow">Analysis Dashboard</p>
                <h3 id="upload-result-title">Resume upload accepted</h3>
              </div>
              <p>
                Deterministic intake metadata from the current upload session. No scores, ordered
                matches, or AI interpretation is applied.
              </p>
            </div>

            <section
              ref={analysisSummaryRef}
              className="analysis-summary-panel"
              aria-labelledby="analysis-summary-title"
              tabIndex={-1}
            >
              <div>
                <p className="eyebrow">Analysis Summary</p>
                <h4 id="analysis-summary-title">Deterministic pipeline overview</h4>
              </div>

              <dl className="analysis-summary-grid">
                {getAnalysisSummaryItems(uploadState.result).map((item) => (
                  <div key={item.label}>
                    <dt>{item.label}</dt>
                    <dd>{item.value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <nav className="analysis-dashboard-nav" aria-label="Analysis dashboard sections">
              <a href="#application-target-title">Application Target</a>
              <a href="#target-alignment-title">Target Alignment</a>
              <a href="#resume-intake-title">Resume Intake</a>
              <a href="#resume-structure-title">Resume Structure</a>
              <a href="#skill-signals-title">Skill Signals</a>
              <a href="#ats-feedback-title">ATS Metadata</a>
              <a href="#role-matches-title">Role Matching</a>
            </nav>

            <section className="dashboard-section" aria-labelledby="application-target-title">
              <div className="dashboard-section-header">
                <p className="eyebrow">Application Target</p>
                <h4 id="application-target-title">Target criteria metadata</h4>
              </div>

              {uploadState.result.target_criteria.status === "provided" ? (
                <div className="target-summary-grid">
                  <dl className="metadata-summary-list">
                    <div>
                      <dt>Target role</dt>
                      <dd>{uploadState.result.target_criteria.target_role || "Not provided"}</dd>
                    </div>
                    <div>
                      <dt>Required skills</dt>
                      <dd>{uploadState.result.target_criteria.required_skills.length}</dd>
                    </div>
                    <div>
                      <dt>Preferred skills</dt>
                      <dd>{uploadState.result.target_criteria.preferred_skills.length}</dd>
                    </div>
                    <div>
                      <dt>Criteria status</dt>
                      <dd>Provided</dd>
                    </div>
                  </dl>

                  <section aria-labelledby="target-required-sections-title">
                    <h5 id="target-required-sections-title">Selected required sections</h5>
                    {uploadState.result.target_criteria.required_sections.length > 0 ? (
                      <ul className="section-chip-list">
                        {uploadState.result.target_criteria.required_sections.map((sectionName) => (
                          <li key={sectionName}>{formatTargetSectionName(sectionName)}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="section-empty-state">No required sections selected.</p>
                    )}
                  </section>

                  <section aria-labelledby="target-priorities-title">
                    <h5 id="target-priorities-title">Selected analysis priorities</h5>
                    {uploadState.result.target_criteria.analysis_priorities.length > 0 ? (
                      <ul className="section-chip-list section-chip-list--muted">
                        {uploadState.result.target_criteria.analysis_priorities.map((priority) => (
                          <li key={priority}>{formatAnalysisPriority(priority)}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="section-empty-state">No analysis priorities selected.</p>
                    )}
                  </section>
                </div>
              ) : (
                <p className="section-empty-state">
                  No target criteria were provided for this analysis.
                </p>
              )}
            </section>

            <section className="dashboard-section" aria-labelledby="target-alignment-title">
              <div className="dashboard-section-header">
                <p className="eyebrow">Target Alignment</p>
                <h4 id="target-alignment-title">Evidence-backed alignment metadata</h4>
              </div>

              {uploadState.result.target_alignment.status === "not_provided" ? (
                <p className="section-empty-state">
                  No target criteria were provided for this analysis.
                </p>
              ) : uploadState.result.target_alignment.status === "insufficient_data" ? (
                <p className="section-empty-state">{uploadState.result.target_alignment.message}</p>
              ) : (
                <div className="target-alignment-layout">
                  <dl className="metadata-summary-list">
                    <div>
                      <dt>Alignment status</dt>
                      <dd>
                        {formatTargetAlignmentStatus(uploadState.result.target_alignment.status)}
                      </dd>
                    </div>
                    <div>
                      <dt>Required skills found</dt>
                      <dd>
                        {uploadState.result.target_alignment.summary.required_skills_found} of{" "}
                        {uploadState.result.target_alignment.summary.required_skills_total}
                      </dd>
                    </div>
                    <div>
                      <dt>Preferred skills found</dt>
                      <dd>
                        {uploadState.result.target_alignment.summary.preferred_skills_found} of{" "}
                        {uploadState.result.target_alignment.summary.preferred_skills_total}
                      </dd>
                    </div>
                    <div>
                      <dt>Required sections detected</dt>
                      <dd>
                        {uploadState.result.target_alignment.summary.required_sections_found} of{" "}
                        {uploadState.result.target_alignment.summary.required_sections_total}
                      </dd>
                    </div>
                    <div>
                      <dt>Priorities evaluated</dt>
                      <dd>
                        {uploadState.result.target_alignment.summary.priorities_evaluated} of{" "}
                        {uploadState.result.target_alignment.summary.priorities_total}
                      </dd>
                    </div>
                    <div>
                      <dt>Target role context</dt>
                      <dd>
                        {formatTargetRoleMappingStatus(
                          uploadState.result.target_alignment.target_role.status,
                        )}
                      </dd>
                    </div>
                  </dl>

                  <div className="target-alignment-grid">
                    <section aria-labelledby="required-skills-alignment-title">
                      <h5 id="required-skills-alignment-title">Required Skills</h5>
                      {uploadState.result.target_alignment.required_skills.length > 0 ? (
                        <ul className="alignment-list">
                          {uploadState.result.target_alignment.required_skills.map((item) => (
                            <li key={`required-${item.normalized_skill}`}>
                              <div className="alignment-item-header">
                                <strong>{item.submitted_skill}</strong>
                                <span>{formatAlignmentItemStatus(item.status)}</span>
                              </div>
                              {item.evidence[0] ? (
                                <p>{item.evidence[0].source_label} explicit evidence found.</p>
                              ) : (
                                <p>Explicit evidence not found in detected skill signals.</p>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="section-empty-state">No required skills provided.</p>
                      )}
                    </section>

                    <section aria-labelledby="preferred-skills-alignment-title">
                      <h5 id="preferred-skills-alignment-title">Preferred Skills</h5>
                      {uploadState.result.target_alignment.preferred_skills.length > 0 ? (
                        <ul className="alignment-list">
                          {uploadState.result.target_alignment.preferred_skills.map((item) => (
                            <li key={`preferred-${item.normalized_skill}`}>
                              <div className="alignment-item-header">
                                <strong>{item.submitted_skill}</strong>
                                <span>{formatAlignmentItemStatus(item.status)}</span>
                              </div>
                              {item.evidence[0] ? (
                                <p>{item.evidence[0].source_label} explicit evidence found.</p>
                              ) : (
                                <p>Explicit evidence not found in detected skill signals.</p>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="section-empty-state">No preferred skills provided.</p>
                      )}
                    </section>

                    <section aria-labelledby="required-sections-alignment-title">
                      <h5 id="required-sections-alignment-title">Required Sections</h5>
                      {uploadState.result.target_alignment.required_sections.length > 0 ? (
                        <ul className="alignment-list">
                          {uploadState.result.target_alignment.required_sections.map((item) => (
                            <li key={item.section}>
                              <div className="alignment-item-header">
                                <strong>{item.display_label}</strong>
                                <span>{formatAlignmentItemStatus(item.status)}</span>
                              </div>
                              {item.evidence[0] ? (
                                <p>{item.evidence[0].detail}</p>
                              ) : (
                                <p>Section heading was not detected.</p>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="section-empty-state">No required sections provided.</p>
                      )}
                    </section>

                    <section aria-labelledby="priorities-alignment-title">
                      <h5 id="priorities-alignment-title">Analysis Priorities</h5>
                      {uploadState.result.target_alignment.analysis_priorities.length > 0 ? (
                        <ul className="alignment-list">
                          {uploadState.result.target_alignment.analysis_priorities.map((item) => (
                            <li key={item.priority}>
                              <div className="alignment-item-header">
                                <strong>{item.display_label}</strong>
                                <span>{formatAlignmentItemStatus(item.status)}</span>
                              </div>
                              {item.evidence[0] ? (
                                <p>{item.evidence[0].detail}</p>
                              ) : (
                                <p>Metadata was not available for this priority.</p>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="section-empty-state">No analysis priorities selected.</p>
                      )}
                    </section>

                    <section aria-labelledby="target-role-alignment-title">
                      <h5 id="target-role-alignment-title">Target Role Context</h5>
                      <dl className="metadata-summary-list">
                        <div>
                          <dt>Submitted role</dt>
                          <dd>
                            {uploadState.result.target_alignment.target_role.target_role ||
                              "Not provided"}
                          </dd>
                        </div>
                        <div>
                          <dt>Controlled profile state</dt>
                          <dd>
                            {formatTargetRoleMappingStatus(
                              uploadState.result.target_alignment.target_role.status,
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt>Controlled profile</dt>
                          <dd>
                            {uploadState.result.target_alignment.target_role.controlled_profile ||
                              "Not mapped"}
                          </dd>
                        </div>
                      </dl>
                    </section>
                  </div>
                </div>
              )}
            </section>

            <section className="dashboard-section" aria-labelledby="resume-intake-title">
              <div className="dashboard-section-header">
                <p className="eyebrow">Resume Intake</p>
                <h4 id="resume-intake-title">Upload and extraction metadata</h4>
              </div>

              <div className="dashboard-two-column">
                <dl className="upload-result-list">
                  <div>
                    <dt>Filename</dt>
                    <dd>{uploadState.result.intake.filename}</dd>
                  </div>
                  <div>
                    <dt>File size</dt>
                    <dd>{formatFileSize(uploadState.result.intake.size_bytes)}</dd>
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
                    <dt>Pipeline state</dt>
                    <dd>Analysis workflow metadata available</dd>
                  </div>
                </dl>

                <section className="text-preview-panel" aria-labelledby="text-preview-title">
                  <div>
                    <p className="eyebrow">Extracted Text Preview</p>
                    <h5 id="text-preview-title">Extracted resume text</h5>
                  </div>

                  {uploadState.result.extraction.extracted_text ? (
                    <>
                      <pre
                        id="text-preview-content"
                        className="text-preview-content"
                        aria-labelledby="text-preview-title"
                      >
                        {getPreviewText(
                          uploadState.result.extraction.extracted_text,
                          isTextPreviewExpanded,
                        )}
                      </pre>
                      {uploadState.result.extraction.extracted_text.length >
                      EXTRACTED_TEXT_PREVIEW_LIMIT ? (
                        <button
                          className="text-preview-toggle"
                          type="button"
                          aria-expanded={isTextPreviewExpanded}
                          aria-controls="text-preview-content"
                          onClick={() => setIsTextPreviewExpanded((currentValue) => !currentValue)}
                        >
                          {isTextPreviewExpanded ? "Collapse preview" : "Expand preview"}
                        </button>
                      ) : null}
                    </>
                  ) : (
                    <p className="section-empty-state">Extracted text preview unavailable.</p>
                  )}
                </section>
              </div>
            </section>

            <section className="dashboard-section" aria-labelledby="resume-structure-title">
              <div className="dashboard-section-header">
                <p className="eyebrow">Resume Structure</p>
                <h4 id="resume-structure-title">Completeness and detected sections</h4>
              </div>

              <div className="dashboard-two-column">
                <section className="completeness-panel" aria-labelledby="completeness-title">
                  <div>
                    <p className="eyebrow">Completeness Baseline</p>
                    <h5 id="completeness-title">Detected resume sections</h5>
                  </div>

                  {uploadState.result.completeness ? (
                    <>
                      <p className="completeness-score">
                        {formatCompletenessRatio(uploadState.result.completeness)}
                      </p>

                      <div className="section-summary-grid">
                        <section aria-labelledby="present-sections-title">
                          <h5 id="present-sections-title">Present sections</h5>
                          {uploadState.result.completeness.present_sections.length > 0 ? (
                            <ul className="section-chip-list">
                              {uploadState.result.completeness.present_sections.map(
                                (sectionName) => (
                                  <li key={sectionName}>{formatSectionName(sectionName)}</li>
                                ),
                              )}
                            </ul>
                          ) : (
                            <p className="section-empty-state">No expected sections detected.</p>
                          )}
                        </section>

                        <section aria-labelledby="missing-sections-title">
                          <h5 id="missing-sections-title">Missing sections</h5>
                          {uploadState.result.completeness.missing_sections.length > 0 ? (
                            <ul className="section-chip-list section-chip-list--muted">
                              {uploadState.result.completeness.missing_sections.map(
                                (sectionName) => (
                                  <li key={sectionName}>{formatSectionName(sectionName)}</li>
                                ),
                              )}
                            </ul>
                          ) : (
                            <p className="section-empty-state">No expected sections missing.</p>
                          )}
                        </section>
                      </div>
                    </>
                  ) : (
                    <p className="section-empty-state">Completeness metadata unavailable.</p>
                  )}
                </section>

                <section
                  className="detected-sections-panel"
                  aria-labelledby="detected-sections-title"
                >
                  <div>
                    <p className="eyebrow">Detected Sections</p>
                    <h5 id="detected-sections-title">Detected headings and line ranges</h5>
                  </div>

                  {uploadState.result.extraction.sections.length > 0 ? (
                    <ul className="detected-section-list">
                      {uploadState.result.extraction.sections.map((section) => (
                        <li key={`${section.name}-${section.start_line}-${section.end_line}`}>
                          <div>
                            <strong>{formatSectionName(section.name)}</strong>
                            <span>{section.heading}</span>
                          </div>
                          <p>{formatLineRange(section.start_line, section.end_line)}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="section-empty-state">No detected section details available.</p>
                  )}
                </section>
              </div>
            </section>

            <section className="dashboard-section" aria-labelledby="skill-signals-title">
              <div className="dashboard-section-header">
                <p className="eyebrow">Skill Signals</p>
                <h4 id="skill-signals-title">Explicit skill mention metadata</h4>
              </div>

              <section className="skill-signals-panel" aria-labelledby="skill-signals-detail-title">
                <div>
                  <p className="eyebrow">Skill Signals Metadata</p>
                  <h5 id="skill-signals-detail-title">Explicit skill mentions</h5>
                </div>

                {isSkillSignalsResult(uploadState.result.skills) ? (
                  <>
                    <dl className="metadata-summary-list">
                      <div>
                        <dt>Signal status</dt>
                        <dd>{formatSkillSignalStatus(uploadState.result.skills.status)}</dd>
                      </div>
                      <div>
                        <dt>Explicit signals</dt>
                        <dd>{uploadState.result.skills.signals.length}</dd>
                      </div>
                    </dl>

                    {uploadState.result.skills.signals.length > 0 ? (
                      <ul className="skill-signals-list">
                        {uploadState.result.skills.signals.map((signal) => {
                          const primaryEvidence = signal.evidence[0];

                          return (
                            <li key={`${signal.name}-${primaryEvidence.line_number}`}>
                              <div className="skill-signal-header">
                                <strong>{signal.name}</strong>
                                <span>{formatSkillCategory(signal.category)}</span>
                              </div>
                              <dl className="skill-evidence-list">
                                <div>
                                  <dt>Source area</dt>
                                  <dd>{formatSkillSourceArea(primaryEvidence.source_area)}</dd>
                                </div>
                                <div>
                                  <dt>Evidence line</dt>
                                  <dd>{primaryEvidence.line_number}</dd>
                                </div>
                                <div>
                                  <dt>Matched text</dt>
                                  <dd>{primaryEvidence.matched_text}</dd>
                                </div>
                              </dl>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="section-empty-state">No explicit skill signals available.</p>
                    )}
                  </>
                ) : (
                  <p className="section-empty-state">Skill signal metadata unavailable.</p>
                )}
              </section>
            </section>

            <section className="dashboard-section" aria-labelledby="ats-feedback-title">
              <div className="dashboard-section-header">
                <p className="eyebrow">ATS Metadata</p>
                <h4 id="ats-feedback-title">Deterministic resume signals</h4>
              </div>

              {isAtsFeedbackResult(uploadState.result.ats) ? (
                <>
                  <dl className="metadata-summary-list">
                    <div>
                      <dt>Feedback status</dt>
                      <dd>{formatAtsFeedbackStatus(uploadState.result.ats.status)}</dd>
                    </div>
                    <div>
                      <dt>Score state</dt>
                      <dd>{formatAtsScorePlaceholder(uploadState.result.ats.score.status)}</dd>
                    </div>
                  </dl>

                  {uploadState.result.ats.issues.length > 0 ? (
                    <ul className="ats-feedback-list">
                      {uploadState.result.ats.issues.map((issue) => (
                        <li key={`${issue.category}-${issue.observed_signal}`}>
                          <div>
                            <strong>{formatAtsIssueCategory(issue.category)}</strong>
                            <span>{issue.severity === "warning" ? "Warning" : "Info"}</span>
                          </div>
                          <p>{issue.title}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="section-empty-state">No ATS feedback issues available.</p>
                  )}
                </>
              ) : (
                <p className="section-empty-state">ATS feedback metadata unavailable.</p>
              )}
            </section>

            <section className="dashboard-section" aria-labelledby="role-matches-title">
              <div className="dashboard-section-header">
                <p className="eyebrow">Role Matching</p>
                <h4 id="role-matches-title">Deterministic internship role candidates</h4>
              </div>

              {isRoleMatchesResult(uploadState.result.roles) ? (
                uploadState.result.roles.candidates.length > 0 ? (
                  <ul className="role-match-list">
                    {uploadState.result.roles.candidates.map((candidate) => (
                      <li key={candidate.role_name}>
                        <div className="role-match-header">
                          <strong>{candidate.role_name}</strong>
                          <span>{formatRoleMatchStatus(candidate.match_status)}</span>
                        </div>

                        <dl className="role-match-metadata">
                          <div>
                            <dt>Confidence state</dt>
                            <dd>{formatRoleConfidenceState(candidate.confidence_state)}</dd>
                          </div>
                          <div>
                            <dt>Matched skill signals</dt>
                            <dd>
                              {candidate.matched_skill_signals.length > 0
                                ? candidate.matched_skill_signals.join(", ")
                                : "None detected"}
                            </dd>
                          </div>
                          <div>
                            <dt>Missing required signals</dt>
                            <dd>
                              {candidate.missing_required_signals.length > 0
                                ? candidate.missing_required_signals.join(", ")
                                : "None listed"}
                            </dd>
                          </div>
                        </dl>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="section-empty-state">Role matching metadata unavailable.</p>
                )
              ) : (
                <p className="section-empty-state">Role matching metadata unavailable.</p>
              )}
            </section>
          </section>
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
