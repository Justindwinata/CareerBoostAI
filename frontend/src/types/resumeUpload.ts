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

export type AtsFeedbackIssueCategory =
  | "section_presence"
  | "section_structure"
  | "formatting_risk"
  | "keyword_coverage_placeholder"
  | "readability_structure";

export type AtsFeedbackIssue = {
  category: AtsFeedbackIssueCategory;
  severity: "info" | "warning";
  title: string;
  description: string;
  observed_signal: string;
  related_sections: ResumeSectionName[];
};

export type AtsFeedbackResult = {
  status: "metadata_ready" | "not_evaluated";
  source: "deterministic_resume_signals";
  issues: AtsFeedbackIssue[];
  keyword_coverage: {
    status: "not_evaluated";
    matched_keywords: [];
    missing_keywords: [];
  };
  score: {
    status: "not_scored";
    score: null;
  };
};

export type SkillSignalCategory =
  "programming_language" | "framework" | "database" | "tooling" | "testing" | "web_technology";

export type SkillSourceArea = ResumeSectionName | "document";

export type SkillSignalEvidence = {
  matched_text: string;
  source_area: SkillSourceArea;
  line_number: number;
  evidence_text: string;
};

export type SkillSignal = {
  name: string;
  category: SkillSignalCategory;
  evidence_level: "explicit_mention";
  evidence: SkillSignalEvidence[];
};

export type SkillSignalsResult = {
  status: "signals_detected" | "no_signals" | "not_evaluated";
  source: "deterministic_normalized_text";
  signals: SkillSignal[];
};

export type InternshipRoleName =
  | "Backend Developer Intern"
  | "Frontend Developer Intern"
  | "Full Stack Developer Intern"
  | "Data Analyst Intern"
  | "Machine Learning Intern";

export type RoleMatchCandidate = {
  role_name: InternshipRoleName;
  match_status: "matched" | "partial_match" | "not_matched" | "insufficient_data";
  confidence_state: "metadata_ready" | "insufficient_data" | "not_evaluated";
  deterministic_evidence: string[];
  matched_skill_signals: string[];
  missing_required_signals: string[];
  supporting_sections: ResumeSectionName[];
};

export type RoleMatchesResult = {
  status: "metadata_ready" | "insufficient_data" | "not_evaluated";
  source: "deterministic_resume_metadata";
  candidates: RoleMatchCandidate[];
};

export type ResumeCompletenessResult = {
  expected_sections: ResumeSectionName[];
  present_sections: ResumeSectionName[];
  missing_sections: ResumeSectionName[];
  score: number;
};

export type ResumeUploadResponse = {
  status: "intake_completed" | "failed";
  intake: ResumeIntakeResult;
  extraction: ResumeExtractionResult;
  completeness: ResumeCompletenessResult | null;
  ats: AnalysisStagePlaceholder | AtsFeedbackResult;
  skills: AnalysisStagePlaceholder | SkillSignalsResult;
  roles: AnalysisStagePlaceholder | RoleMatchesResult;
  recommendations: AnalysisStagePlaceholder;
};

export type ResumeUploadError = {
  detail?: string;
};

export type ResumeUploadResult = ResumeUploadResponse & {
  uploaded_at: string;
};
