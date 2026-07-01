"""Deterministic ATS feedback generation from existing resume metadata."""

from careerboost_api.domain import (
    AtsFeedbackContract,
    AtsFeedbackIssue,
    DetectedResumeSection,
    ResumeCompletenessContract,
    ResumeExtractionContract,
    ResumeSectionName,
)

LOW_TEXT_FORMATTING_THRESHOLD = 600


class AtsFeedbackService:
    """Generate non-scored ATS feedback issues from observable resume metadata."""

    def generate(
        self,
        *,
        extraction: ResumeExtractionContract | None,
        completeness: ResumeCompletenessContract | None,
    ) -> AtsFeedbackContract:
        if extraction is None or extraction.status != "extracted" or completeness is None:
            return self._build_not_evaluated_contract()

        issues = [
            *self._build_missing_section_issues(completeness),
            *self._build_section_structure_issues(extraction.sections),
            *self._build_formatting_risk_issues(extraction),
            *self._build_readability_issues(extraction),
            self._build_keyword_coverage_placeholder_issue(),
        ]

        return AtsFeedbackContract(status="metadata_ready", issues=issues)

    def _build_not_evaluated_contract(self) -> AtsFeedbackContract:
        return AtsFeedbackContract(
            status="not_evaluated",
            issues=[
                AtsFeedbackIssue(
                    category="readability_structure",
                    severity="warning",
                    title="ATS feedback not evaluated",
                    description=(
                        "ATS feedback metadata was not generated because extracted resume text "
                        "or completeness metadata is unavailable."
                    ),
                    observed_signal="ats_feedback:insufficient_data",
                )
            ],
        )

    def _build_missing_section_issues(
        self,
        completeness: ResumeCompletenessContract,
    ) -> list[AtsFeedbackIssue]:
        return [
            AtsFeedbackIssue(
                category="section_presence",
                severity="warning",
                title="Expected section not detected",
                description=(
                    f"The {self._format_section_name(section)} section was not detected by "
                    "deterministic resume headings."
                ),
                observed_signal=f"missing_section:{section}",
                related_sections=[section],
            )
            for section in completeness.missing_sections
        ]

    def _build_section_structure_issues(
        self,
        sections: list[DetectedResumeSection],
    ) -> list[AtsFeedbackIssue]:
        issues: list[AtsFeedbackIssue] = []

        if not sections:
            issues.append(
                AtsFeedbackIssue(
                    category="section_structure",
                    severity="warning",
                    title="No resume headings detected",
                    description=(
                        "No expected resume section headings were detected in the extracted text."
                    ),
                    observed_signal="section_count:0",
                )
            )
            return issues

        for section in sections:
            if section.content.strip():
                continue

            issues.append(
                AtsFeedbackIssue(
                    category="section_structure",
                    severity="warning",
                    title="Detected section has no extracted content",
                    description=(
                        f"The {self._format_section_name(section.name)} heading was detected, "
                        "but no section content was extracted under that heading."
                    ),
                    observed_signal=f"section_content_empty:{section.name}",
                    related_sections=[section.name],
                )
            )

        return issues

    def _build_formatting_risk_issues(
        self,
        extraction: ResumeExtractionContract,
    ) -> list[AtsFeedbackIssue]:
        if extraction.character_count >= LOW_TEXT_FORMATTING_THRESHOLD:
            return []

        return [
            AtsFeedbackIssue(
                category="formatting_risk",
                severity="warning",
                title="Low extracted text volume",
                description=(
                    "The extracted text length is below the deterministic metadata review "
                    "threshold."
                ),
                observed_signal=f"character_count:<{LOW_TEXT_FORMATTING_THRESHOLD}",
            )
        ]

    def _build_readability_issues(
        self,
        extraction: ResumeExtractionContract,
    ) -> list[AtsFeedbackIssue]:
        if extraction.confidence != "medium":
            return []

        return [
            AtsFeedbackIssue(
                category="readability_structure",
                severity="info",
                title="Medium extraction confidence",
                description=(
                    "Text was extracted, but the extraction confidence was lower than the "
                    "highest available deterministic confidence level."
                ),
                observed_signal="extraction_confidence:medium",
            )
        ]

    def _build_keyword_coverage_placeholder_issue(self) -> AtsFeedbackIssue:
        return AtsFeedbackIssue(
            category="keyword_coverage_placeholder",
            severity="info",
            title="Keyword coverage not evaluated",
            description="Keyword coverage requires a future role-specific keyword source.",
            observed_signal="keyword_coverage:not_evaluated",
        )

    def _format_section_name(self, section: ResumeSectionName) -> str:
        return section.replace("_", " ").title()
