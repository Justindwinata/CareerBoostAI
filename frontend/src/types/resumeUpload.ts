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

export type ResumeSectionName =
  | "summary"
  | "skills"
  | "experience"
  | "education"
  | "projects"
  | "certifications"
  | "organizations"
  | "awards";

export type TargetRequiredSectionName = ResumeSectionName | "certifications";

export type TargetAnalysisPriority =
  | "resume_structure"
  | "ats_compatibility"
  | "skill_visibility"
  | "role_alignment"
  | "project_evidence"
  | "education_fit";

export type TargetCriteria = {
  status: "not_provided" | "provided";
  target_role: string;
  target_description: string;
  required_skills: string[];
  preferred_skills: string[];
  required_sections: TargetRequiredSectionName[];
  analysis_priorities: TargetAnalysisPriority[];
  experience_expectation: string;
  education_expectation: string;
  notes: string;
};

export type TargetCriteriaInput = Omit<TargetCriteria, "status">;

export type TargetAlignmentEvidence = {
  source_type:
    | "explicit_skill_signal"
    | "detected_resume_section"
    | "metadata_available"
    | "controlled_role_profile";
  source_label: string;
  source_area: string;
  line_number: number | null;
  detail: string;
};

export type TargetSkillAlignmentItem = {
  category: "required" | "preferred";
  submitted_skill: string;
  normalized_skill: string;
  status: "found" | "not_found";
  evidence: TargetAlignmentEvidence[];
};

export type TargetSectionAlignmentItem = {
  section: TargetRequiredSectionName;
  display_label: string;
  status: "detected" | "missing";
  evidence: TargetAlignmentEvidence[];
};

export type TargetPriorityAlignmentItem = {
  priority: TargetAnalysisPriority;
  display_label: string;
  status: "evaluated" | "not_evaluated";
  evidence: TargetAlignmentEvidence[];
};

export type TargetRoleContext = {
  status: "not_provided" | "mapped_to_controlled_profile" | "not_mapped_to_controlled_profile";
  target_role: string;
  controlled_profile: InternshipRoleName | null;
  evidence: TargetAlignmentEvidence[];
};

export type TargetAlignmentResult = {
  status: "not_provided" | "evaluated" | "insufficient_data";
  summary: {
    required_skills_total: number;
    required_skills_found: number;
    required_skills_missing: number;
    preferred_skills_total: number;
    preferred_skills_found: number;
    required_sections_total: number;
    required_sections_found: number;
    required_sections_missing: number;
    priorities_total: number;
    priorities_evaluated: number;
  };
  required_skills: TargetSkillAlignmentItem[];
  preferred_skills: TargetSkillAlignmentItem[];
  required_sections: TargetSectionAlignmentItem[];
  analysis_priorities: TargetPriorityAlignmentItem[];
  target_role: TargetRoleContext;
  message: string;
};

export type DetectedResumeSection = {
  name: ResumeSectionName;
  heading: string;
  start_line: number;
  end_line: number;
  content: string;
};

export type ExtractionQualityWarning = {
  category: "unusual_section_order" | "candidate_name_after_sections" | "short_section_content";
  message: string;
};

export type SuccessfulResumeExtractionResult = {
  status: "extracted";
  confidence: "medium" | "high";
  character_count: number;
  page_count: number;
  extracted_text: string;
  normalized_text: string;
  sections: DetectedResumeSection[];
  quality_warnings: ExtractionQualityWarning[];
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
  quality_warnings: [];
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
  analysis_id: string | null;
  status: "intake_completed" | "failed";
  intake: ResumeIntakeResult;
  extraction: ResumeExtractionResult;
  completeness: ResumeCompletenessResult | null;
  target_criteria: TargetCriteria;
  target_alignment: TargetAlignmentResult;
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

export type AnalysisHistorySummary = {
  analysis_id: string;
  created_at: string;
  filename: string;
  target_role: string;
  target_criteria_status: TargetCriteria["status"];
  target_alignment_status: TargetAlignmentResult["status"];
  detected_section_count: number;
  skill_signal_count: number;
  role_profile_count: number;
};
