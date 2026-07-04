import { forwardRef, useState } from "react";

import type {
  AtsFeedbackResult,
  ResumeSectionName,
  ResumeUploadResponse,
  RoleMatchesResult,
  SkillSignalCategory,
  SkillSignalsResult,
  SkillSourceArea,
  TargetAlignmentResult,
  TargetAnalysisPriority,
  TargetRequiredSectionName,
} from "../types/resumeUpload";

const EXTRACTED_TEXT_PREVIEW_LIMIT = 360;

type AnalysisDashboardProps = {
  result: ResumeUploadResponse;
  uploadedAt?: string | null;
  title?: string;
  description?: string;
  headingLevel?: "h2" | "h3";
};

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

function formatConfidence(confidence: ResumeUploadResponse["extraction"]["confidence"]): string {
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
    certifications: "Certifications",
    organizations: "Organizations",
    awards: "Awards",
  };

  return sectionLabels[sectionName];
}

function formatTargetSectionName(sectionName: TargetRequiredSectionName): string {
  return sectionName === "certifications" ? "Certifications" : formatSectionName(sectionName);
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

function formatCompletenessRatio(completeness: NonNullable<ResumeUploadResponse["completeness"]>) {
  const detectedCount = completeness.present_sections.length;
  const expectedCount = completeness.expected_sections.length;
  const percentage = Math.round(completeness.score * 100);

  return `${detectedCount} of ${expectedCount} expected sections detected (${percentage}%)`;
}

function formatLineRange(startLine: number, endLine: number): string {
  return startLine === endLine ? `Line ${startLine}` : `Lines ${startLine}-${endLine}`;
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

function isAtsFeedbackResult(ats: ResumeUploadResponse["ats"]): ats is AtsFeedbackResult {
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

function isSkillSignalsResult(
  skills: ResumeUploadResponse["skills"],
): skills is SkillSignalsResult {
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

function isRoleMatchesResult(roles: ResumeUploadResponse["roles"]): roles is RoleMatchesResult {
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

function getAnalysisSummaryItems(result: ResumeUploadResponse) {
  const hasAtsMetadata = isAtsFeedbackResult(result.ats);
  const hasSkillMetadata = isSkillSignalsResult(result.skills);
  const hasRoleMetadata = isRoleMatchesResult(result.roles);
  const explicitSkillSignalCount = isSkillSignalsResult(result.skills)
    ? result.skills.signals.length
    : null;
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
    { label: "Completeness status", value: result.completeness ? "Available" : "Unavailable" },
    {
      label: "Application target",
      value: result.target_criteria.status === "provided" ? "Provided" : "Not provided",
    },
    {
      label: "Target alignment",
      value: formatTargetAlignmentStatus(result.target_alignment.status),
    },
    { label: "Detected sections", value: `${result.extraction.sections.length} detected` },
    {
      label: "Parsing warnings",
      value:
        result.extraction.quality_warnings.length > 0
          ? `${result.extraction.quality_warnings.length} advisory`
          : "None",
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

export const AnalysisDashboard = forwardRef<HTMLElement, AnalysisDashboardProps>(
  (
    {
      result,
      uploadedAt = null,
      title = "Resume upload accepted",
      description = "Deterministic intake metadata from the current upload session. No scores, ordered matches, or AI interpretation is applied.",
      headingLevel = "h3",
    },
    ref,
  ) => {
    const [isTextPreviewExpanded, setIsTextPreviewExpanded] = useState(false);
    const DashboardTitle = headingLevel;
    const SectionTitle = headingLevel === "h2" ? "h3" : "h4";
    const DetailTitle = headingLevel === "h2" ? "h4" : "h5";

    return (
      <section className="upload-result-panel" aria-labelledby="analysis-dashboard-title">
        <div className="analysis-dashboard-header">
          <div>
            <p className="eyebrow">Analysis Dashboard</p>
            <DashboardTitle id="analysis-dashboard-title">{title}</DashboardTitle>
          </div>
          <p>{description}</p>
        </div>

        <section
          ref={ref}
          className="analysis-summary-panel"
          aria-labelledby="analysis-summary-title"
          tabIndex={-1}
        >
          <div>
            <p className="eyebrow">Analysis Summary</p>
            <SectionTitle id="analysis-summary-title">Deterministic pipeline overview</SectionTitle>
          </div>

          <dl className="analysis-summary-grid">
            {getAnalysisSummaryItems(result).map((item) => (
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
            <SectionTitle id="application-target-title">Target criteria metadata</SectionTitle>
          </div>

          {result.target_criteria.status === "provided" ? (
            <div className="target-summary-grid">
              <dl className="metadata-summary-list">
                <div>
                  <dt>Target role</dt>
                  <dd>{result.target_criteria.target_role || "Not provided"}</dd>
                </div>
                <div>
                  <dt>Required skills</dt>
                  <dd>{result.target_criteria.required_skills.length}</dd>
                </div>
                <div>
                  <dt>Preferred skills</dt>
                  <dd>{result.target_criteria.preferred_skills.length}</dd>
                </div>
                <div>
                  <dt>Criteria status</dt>
                  <dd>Provided</dd>
                </div>
              </dl>

              <section aria-labelledby="target-required-sections-title">
                <DetailTitle id="target-required-sections-title">
                  Selected required sections
                </DetailTitle>
                {result.target_criteria.required_sections.length > 0 ? (
                  <ul className="section-chip-list">
                    {result.target_criteria.required_sections.map((sectionName) => (
                      <li key={sectionName}>{formatTargetSectionName(sectionName)}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="section-empty-state">No required sections selected.</p>
                )}
              </section>

              <section aria-labelledby="target-priorities-title">
                <DetailTitle id="target-priorities-title">Selected analysis priorities</DetailTitle>
                {result.target_criteria.analysis_priorities.length > 0 ? (
                  <ul className="section-chip-list section-chip-list--muted">
                    {result.target_criteria.analysis_priorities.map((priority) => (
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
            <SectionTitle id="target-alignment-title">
              Evidence-backed alignment metadata
            </SectionTitle>
          </div>

          {result.target_alignment.status === "not_provided" ? (
            <p className="section-empty-state">
              No target criteria were provided for this analysis.
            </p>
          ) : result.target_alignment.status === "insufficient_data" ? (
            <p className="section-empty-state">{result.target_alignment.message}</p>
          ) : (
            <div className="target-alignment-layout">
              <dl className="metadata-summary-list">
                <div>
                  <dt>Alignment status</dt>
                  <dd>{formatTargetAlignmentStatus(result.target_alignment.status)}</dd>
                </div>
                <div>
                  <dt>Required skills found</dt>
                  <dd>
                    {result.target_alignment.summary.required_skills_found} of{" "}
                    {result.target_alignment.summary.required_skills_total}
                  </dd>
                </div>
                <div>
                  <dt>Preferred skills found</dt>
                  <dd>
                    {result.target_alignment.summary.preferred_skills_found} of{" "}
                    {result.target_alignment.summary.preferred_skills_total}
                  </dd>
                </div>
                <div>
                  <dt>Required sections detected</dt>
                  <dd>
                    {result.target_alignment.summary.required_sections_found} of{" "}
                    {result.target_alignment.summary.required_sections_total}
                  </dd>
                </div>
                <div>
                  <dt>Priorities evaluated</dt>
                  <dd>
                    {result.target_alignment.summary.priorities_evaluated} of{" "}
                    {result.target_alignment.summary.priorities_total}
                  </dd>
                </div>
                <div>
                  <dt>Target role context</dt>
                  <dd>
                    {formatTargetRoleMappingStatus(result.target_alignment.target_role.status)}
                  </dd>
                </div>
              </dl>

              <div className="target-alignment-grid">
                <section aria-labelledby="required-skills-alignment-title">
                  <DetailTitle id="required-skills-alignment-title">Required Skills</DetailTitle>
                  {result.target_alignment.required_skills.length > 0 ? (
                    <ul className="alignment-list">
                      {result.target_alignment.required_skills.map((item) => (
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
                  <DetailTitle id="preferred-skills-alignment-title">Preferred Skills</DetailTitle>
                  {result.target_alignment.preferred_skills.length > 0 ? (
                    <ul className="alignment-list">
                      {result.target_alignment.preferred_skills.map((item) => (
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
                  <DetailTitle id="required-sections-alignment-title">
                    Required Sections
                  </DetailTitle>
                  {result.target_alignment.required_sections.length > 0 ? (
                    <ul className="alignment-list">
                      {result.target_alignment.required_sections.map((item) => (
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
                  <DetailTitle id="priorities-alignment-title">Analysis Priorities</DetailTitle>
                  {result.target_alignment.analysis_priorities.length > 0 ? (
                    <ul className="alignment-list">
                      {result.target_alignment.analysis_priorities.map((item) => (
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
                  <DetailTitle id="target-role-alignment-title">Target Role Context</DetailTitle>
                  <dl className="metadata-summary-list">
                    <div>
                      <dt>Submitted role</dt>
                      <dd>{result.target_alignment.target_role.target_role || "Not provided"}</dd>
                    </div>
                    <div>
                      <dt>Controlled profile state</dt>
                      <dd>
                        {formatTargetRoleMappingStatus(result.target_alignment.target_role.status)}
                      </dd>
                    </div>
                    <div>
                      <dt>Controlled profile</dt>
                      <dd>
                        {result.target_alignment.target_role.controlled_profile || "Not mapped"}
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
            <SectionTitle id="resume-intake-title">Upload and extraction metadata</SectionTitle>
          </div>

          {result.extraction.quality_warnings.length > 0 ? (
            <section
              className="extraction-warning-panel"
              aria-labelledby="extraction-warning-title"
            >
              <DetailTitle id="extraction-warning-title">Extraction quality advisory</DetailTitle>
              <ul>
                {result.extraction.quality_warnings.map((warning) => (
                  <li key={`${warning.category}-${warning.message}`}>{warning.message}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="dashboard-two-column">
            <dl className="upload-result-list">
              <div>
                <dt>Filename</dt>
                <dd>{result.intake.filename}</dd>
              </div>
              <div>
                <dt>Analysis ID</dt>
                <dd>{result.analysis_id ?? "Not stored"}</dd>
              </div>
              <div>
                <dt>File size</dt>
                <dd>{formatFileSize(result.intake.size_bytes)}</dd>
              </div>
              <div>
                <dt>Upload timestamp</dt>
                <dd>
                  {uploadedAt ? formatUploadTimestamp(uploadedAt) : "Unavailable in stored result"}
                </dd>
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
                <dd>{formatConfidence(result.extraction.confidence)}</dd>
              </div>
              <div>
                <dt>Extracted text</dt>
                <dd>{result.extraction.character_count} readable characters</dd>
              </div>
              <div>
                <dt>Pages processed</dt>
                <dd>{result.extraction.page_count}</dd>
              </div>
              <div>
                <dt>Pipeline state</dt>
                <dd>Analysis workflow metadata available</dd>
              </div>
            </dl>

            <section className="text-preview-panel" aria-labelledby="text-preview-title">
              <div>
                <p className="eyebrow">Extracted Text Preview</p>
                <DetailTitle id="text-preview-title">Extracted resume text</DetailTitle>
              </div>

              {result.extraction.extracted_text ? (
                <>
                  <pre
                    id="text-preview-content"
                    className="text-preview-content"
                    aria-labelledby="text-preview-title"
                  >
                    {getPreviewText(result.extraction.extracted_text, isTextPreviewExpanded)}
                  </pre>
                  {result.extraction.extracted_text.length > EXTRACTED_TEXT_PREVIEW_LIMIT ? (
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
            <SectionTitle id="resume-structure-title">
              Completeness and detected sections
            </SectionTitle>
          </div>

          <div className="dashboard-two-column">
            <section className="completeness-panel" aria-labelledby="completeness-title">
              <div>
                <p className="eyebrow">Completeness Baseline</p>
                <DetailTitle id="completeness-title">Detected resume sections</DetailTitle>
              </div>

              {result.completeness ? (
                <>
                  <p className="completeness-score">
                    {formatCompletenessRatio(result.completeness)}
                  </p>
                  <div className="section-summary-grid">
                    <section aria-labelledby="present-sections-title">
                      <DetailTitle id="present-sections-title">Present sections</DetailTitle>
                      {result.completeness.present_sections.length > 0 ? (
                        <ul className="section-chip-list">
                          {result.completeness.present_sections.map((sectionName) => (
                            <li key={sectionName}>{formatSectionName(sectionName)}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="section-empty-state">No expected sections detected.</p>
                      )}
                    </section>

                    <section aria-labelledby="missing-sections-title">
                      <DetailTitle id="missing-sections-title">Missing sections</DetailTitle>
                      {result.completeness.missing_sections.length > 0 ? (
                        <ul className="section-chip-list section-chip-list--muted">
                          {result.completeness.missing_sections.map((sectionName) => (
                            <li key={sectionName}>{formatSectionName(sectionName)}</li>
                          ))}
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

            <section className="detected-sections-panel" aria-labelledby="detected-sections-title">
              <div>
                <p className="eyebrow">Detected Sections</p>
                <DetailTitle id="detected-sections-title">
                  Detected headings and line ranges
                </DetailTitle>
              </div>

              {result.extraction.sections.length > 0 ? (
                <ul className="detected-section-list">
                  {result.extraction.sections.map((section) => (
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
            <SectionTitle id="skill-signals-title">Explicit skill mention metadata</SectionTitle>
          </div>

          <section className="skill-signals-panel" aria-labelledby="skill-signals-detail-title">
            <div>
              <p className="eyebrow">Skill Signals Metadata</p>
              <DetailTitle id="skill-signals-detail-title">Explicit skill mentions</DetailTitle>
            </div>

            {isSkillSignalsResult(result.skills) ? (
              <>
                <dl className="metadata-summary-list">
                  <div>
                    <dt>Signal status</dt>
                    <dd>{formatSkillSignalStatus(result.skills.status)}</dd>
                  </div>
                  <div>
                    <dt>Explicit signals</dt>
                    <dd>{result.skills.signals.length}</dd>
                  </div>
                </dl>

                {result.skills.signals.length > 0 ? (
                  <ul className="skill-signals-list">
                    {result.skills.signals.map((signal) => {
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
            <SectionTitle id="ats-feedback-title">Deterministic resume signals</SectionTitle>
          </div>

          {isAtsFeedbackResult(result.ats) ? (
            <>
              <dl className="metadata-summary-list">
                <div>
                  <dt>Feedback status</dt>
                  <dd>{formatAtsFeedbackStatus(result.ats.status)}</dd>
                </div>
                <div>
                  <dt>Score state</dt>
                  <dd>{formatAtsScorePlaceholder(result.ats.score.status)}</dd>
                </div>
              </dl>

              {result.ats.issues.length > 0 ? (
                <ul className="ats-feedback-list">
                  {result.ats.issues.map((issue) => (
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
            <SectionTitle id="role-matches-title">
              Deterministic internship role candidates
            </SectionTitle>
          </div>

          {isRoleMatchesResult(result.roles) ? (
            result.roles.candidates.length > 0 ? (
              <ul className="role-match-list">
                {result.roles.candidates.map((candidate) => (
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
    );
  },
);

AnalysisDashboard.displayName = "AnalysisDashboard";
