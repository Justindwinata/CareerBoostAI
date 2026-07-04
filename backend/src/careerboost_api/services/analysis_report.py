"""Standalone HTML report generation for stored resume analyses."""

from collections.abc import Iterable
from datetime import UTC, datetime
from html import escape

from careerboost_api.domain import (
    AtsFeedbackContract,
    ResumeAnalysisContract,
    RoleMatchesContract,
    SkillSignalsContract,
)

EXTRACTED_TEXT_PREVIEW_LIMIT = 1200


class AnalysisReportService:
    """Generate static, self-contained HTML reports from canonical analysis data."""

    def generate_html_report(self, analysis: ResumeAnalysisContract) -> str:
        """Return escaped standalone HTML for one stored analysis."""
        generated_at = datetime.now(UTC).isoformat()
        sections = [
            self._render_report_metadata(analysis, generated_at),
            self._render_application_target(analysis),
            self._render_target_alignment(analysis),
            self._render_resume_structure(analysis),
            self._render_ats_metadata(analysis),
            self._render_skill_signals(analysis),
            self._render_role_matching(analysis),
            self._render_extracted_text_preview(analysis),
            self._render_limitations(),
        ]

        return (
            "<!doctype html>"
            '<html lang="en">'
            "<head>"
            '<meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width, initial-scale=1">'
            "<title>CareerBoost AI Resume Analysis Report</title>"
            f"<style>{self._stylesheet()}</style>"
            "</head>"
            "<body>"
            "<main>"
            '<header class="report-hero">'
            '<p class="eyebrow">CareerBoost AI</p>'
            "<h1>CareerBoost AI Resume Analysis Report</h1>"
            "<p>"
            "Standalone report generated from deterministic resume metadata. "
            "No AI interpretation, numeric scoring, ranking, or hiring prediction is included."
            "</p>"
            "</header>"
            f"{''.join(sections)}"
            "</main>"
            "</body>"
            "</html>"
        )

    def _render_report_metadata(
        self,
        analysis: ResumeAnalysisContract,
        generated_at: str,
    ) -> str:
        rows = [
            ("Analysis ID", analysis.analysis_id or "Unavailable"),
            ("Generated at", generated_at),
            ("Original filename", analysis.intake.filename),
            ("Upload status", analysis.intake.status),
            ("Extraction status", analysis.extraction.status),
            ("Extraction confidence", analysis.extraction.confidence or "Unavailable"),
            ("Page count", str(analysis.extraction.page_count)),
            ("Character count", str(analysis.extraction.character_count)),
        ]
        return self._section("Report metadata", self._definition_list(rows))

    def _render_application_target(self, analysis: ResumeAnalysisContract) -> str:
        criteria = analysis.target_criteria
        rows = [
            ("Target criteria status", criteria.status),
            ("Target role", criteria.target_role or "Not provided"),
            ("Required skills count", str(len(criteria.required_skills))),
            ("Preferred skills count", str(len(criteria.preferred_skills))),
            ("Required sections", self._join_or_empty(criteria.required_sections)),
            ("Analysis priorities", self._join_or_empty(criteria.analysis_priorities)),
            ("Experience expectation", criteria.experience_expectation or "Not provided"),
            ("Education expectation", criteria.education_expectation or "Not provided"),
        ]
        return self._section("Application Target", self._definition_list(rows))

    def _render_target_alignment(self, analysis: ResumeAnalysisContract) -> str:
        alignment = analysis.target_alignment
        summary_rows = [
            ("Alignment status", alignment.status),
            ("Required skills found", str(alignment.summary.required_skills_found)),
            ("Required skills missing", str(alignment.summary.required_skills_missing)),
            ("Preferred skills found", str(alignment.summary.preferred_skills_found)),
            ("Required sections found", str(alignment.summary.required_sections_found)),
            ("Required sections missing", str(alignment.summary.required_sections_missing)),
            ("Priorities evaluated", str(alignment.summary.priorities_evaluated)),
            ("Target role context", alignment.target_role.status),
        ]
        content = [self._definition_list(summary_rows)]
        content.append(
            self._status_list(
                "Required skills",
                [
                    (
                        item.submitted_skill,
                        item.status,
                        self._evidence_summary(item.evidence),
                    )
                    for item in alignment.required_skills
                ],
            )
        )
        content.append(
            self._status_list(
                "Preferred skills",
                [
                    (
                        item.submitted_skill,
                        item.status,
                        self._evidence_summary(item.evidence),
                    )
                    for item in alignment.preferred_skills
                ],
            )
        )
        content.append(
            self._status_list(
                "Required sections",
                [
                    (
                        item.display_label,
                        item.status,
                        self._evidence_summary(item.evidence),
                    )
                    for item in alignment.required_sections
                ],
            )
        )
        content.append(
            self._status_list(
                "Analysis priorities",
                [
                    (
                        item.display_label,
                        item.status,
                        self._evidence_summary(item.evidence),
                    )
                    for item in alignment.analysis_priorities
                ],
            )
        )
        return self._section("Target Alignment", "".join(content))

    def _render_resume_structure(self, analysis: ResumeAnalysisContract) -> str:
        content = [
            self._status_list(
                "Detected sections",
                [
                    (
                        section.name,
                        f"lines {section.start_line}-{section.end_line}",
                        section.heading,
                    )
                    for section in analysis.extraction.sections
                ],
            )
        ]

        if analysis.completeness is not None:
            rows = [
                ("Expected sections", self._join_or_empty(analysis.completeness.expected_sections)),
                ("Present sections", self._join_or_empty(analysis.completeness.present_sections)),
                ("Missing sections", self._join_or_empty(analysis.completeness.missing_sections)),
                ("Completeness ratio", f"{analysis.completeness.score:.2f}"),
            ]
            content.append(self._definition_list(rows))

        return self._section("Resume Structure", "".join(content))

    def _render_ats_metadata(self, analysis: ResumeAnalysisContract) -> str:
        if not isinstance(analysis.ats, AtsFeedbackContract):
            return self._section("ATS Metadata", self._empty_state(analysis.ats.label))

        content = [
            self._definition_list(
                [
                    ("ATS metadata status", analysis.ats.status),
                    ("Source", analysis.ats.source),
                    ("Score boundary", analysis.ats.score.status),
                    ("Keyword coverage", analysis.ats.keyword_coverage.status),
                ]
            ),
            self._status_list(
                "ATS feedback issues",
                [
                    (
                        issue.title,
                        issue.severity,
                        f"{issue.category}: {issue.observed_signal}. {issue.description}",
                    )
                    for issue in analysis.ats.issues
                ],
            ),
        ]
        return self._section("ATS Metadata", "".join(content))

    def _render_skill_signals(self, analysis: ResumeAnalysisContract) -> str:
        if not isinstance(analysis.skills, SkillSignalsContract):
            return self._section("Skill Signals", self._empty_state(analysis.skills.label))

        content = [
            self._definition_list(
                [
                    ("Skill signal status", analysis.skills.status),
                    ("Source", analysis.skills.source),
                    ("Explicit skill signals", str(len(analysis.skills.signals))),
                ]
            ),
            self._status_list(
                "Explicit skill evidence",
                [
                    (
                        signal.name,
                        signal.category,
                        self._join_or_empty(
                            [
                                f"{evidence.source_area} line {evidence.line_number}: "
                                f"{evidence.evidence_text}"
                                for evidence in signal.evidence
                            ]
                        ),
                    )
                    for signal in analysis.skills.signals
                ],
            ),
        ]
        return self._section("Skill Signals", "".join(content))

    def _render_role_matching(self, analysis: ResumeAnalysisContract) -> str:
        if not isinstance(analysis.roles, RoleMatchesContract):
            return self._section("Role Matching Metadata", self._empty_state(analysis.roles.label))

        content = [
            self._definition_list(
                [
                    ("Role metadata status", analysis.roles.status),
                    ("Source", analysis.roles.source),
                    ("Controlled role profiles", str(len(analysis.roles.candidates))),
                ]
            ),
            self._status_list(
                "Role profiles",
                [
                    (
                        candidate.role_name,
                        candidate.match_status,
                        "Matched signals: "
                        f"{self._join_or_empty(candidate.matched_skill_signals)}. "
                        "Missing signals: "
                        f"{self._join_or_empty(candidate.missing_required_signals)}.",
                    )
                    for candidate in analysis.roles.candidates
                ],
            ),
        ]
        return self._section("Role Matching Metadata", "".join(content))

    def _render_extracted_text_preview(self, analysis: ResumeAnalysisContract) -> str:
        extracted_text = analysis.extraction.extracted_text or ""
        if not extracted_text.strip():
            return self._section("Extracted Text Preview", self._empty_state("No extracted text."))

        truncated = extracted_text[:EXTRACTED_TEXT_PREVIEW_LIMIT]
        suffix = (
            "\n\n[Preview truncated]" if len(extracted_text) > EXTRACTED_TEXT_PREVIEW_LIMIT else ""
        )
        return self._section(
            "Extracted Text Preview",
            f"<pre>{escape(truncated + suffix)}</pre>",
        )

    def _render_limitations(self) -> str:
        return self._section(
            "Limitations",
            "<p>"
            "This report is generated from deterministic resume metadata. "
            "It does not guarantee hiring outcomes, interview selection, ATS success, "
            "or candidate quality. It does not include AI interpretation, numeric scoring, "
            "ranked recommendations, or acceptance prediction."
            "</p>",
        )

    def _section(self, title: str, content: str) -> str:
        return f'<section class="report-section"><h2>{escape(title)}</h2>{content}</section>'

    def _definition_list(self, rows: Iterable[tuple[str, str]]) -> str:
        items = []
        for label, value in rows:
            items.append(f"<div><dt>{escape(label)}</dt><dd>{escape(value)}</dd></div>")
        return f'<dl class="metadata-grid">{"".join(items)}</dl>'

    def _status_list(self, title: str, rows: Iterable[tuple[str, str, str]]) -> str:
        items = []
        for label, status, detail in rows:
            items.append(
                "<li>"
                f"<strong>{escape(label)}</strong>"
                f'<span class="badge">{escape(status)}</span>'
                f"<p>{escape(detail)}</p>"
                "</li>"
            )

        if not items:
            return f"<h3>{escape(title)}</h3>{self._empty_state('No metadata available.')}"

        return f'<h3>{escape(title)}</h3><ul class="status-list">{"".join(items)}</ul>'

    def _empty_state(self, message: str) -> str:
        return f'<p class="empty-state">{escape(message)}</p>'

    def _evidence_summary(self, evidence_items: Iterable[object]) -> str:
        details = [getattr(item, "detail", "") for item in evidence_items]
        return self._join_or_empty([detail for detail in details if detail])

    def _join_or_empty(self, values: Iterable[str]) -> str:
        normalized = [str(value).strip() for value in values if str(value).strip()]
        return ", ".join(normalized) if normalized else "None"

    def _stylesheet(self) -> str:
        return """
        :root {
          color-scheme: light;
          --text: #172033;
          --muted: #5c667a;
          --border: #d9e0ea;
          --surface: #ffffff;
          --surface-muted: #f6f8fb;
          --accent: #0f766e;
          --accent-soft: #dff7f4;
        }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          background: var(--surface-muted);
          color: var(--text);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
            "Segoe UI", sans-serif;
          line-height: 1.55;
        }
        main {
          width: min(1040px, calc(100% - 32px));
          margin: 0 auto;
          padding: 32px 0;
        }
        .report-hero,
        .report-section {
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--surface);
          padding: 24px;
          box-shadow: 0 12px 30px rgb(23 32 51 / 8%);
        }
        .report-section { margin-top: 18px; }
        .eyebrow {
          margin: 0 0 8px;
          color: var(--accent);
          font-size: 0.78rem;
          font-weight: 800;
          letter-spacing: 0;
          text-transform: uppercase;
        }
        h1, h2, h3 { margin: 0; line-height: 1.2; }
        h1 { font-size: clamp(2rem, 5vw, 3rem); }
        h2 { font-size: 1.35rem; }
        h3 { margin-top: 20px; font-size: 1rem; }
        p { color: var(--muted); }
        .metadata-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
          gap: 12px;
          margin: 18px 0 0;
        }
        .metadata-grid div {
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--surface-muted);
          padding: 12px;
        }
        dt {
          color: var(--muted);
          font-size: 0.78rem;
          font-weight: 800;
          text-transform: uppercase;
        }
        dd { margin: 4px 0 0; overflow-wrap: anywhere; font-weight: 700; }
        .status-list {
          display: grid;
          gap: 10px;
          padding: 0;
          list-style: none;
        }
        .status-list li {
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 14px;
          background: var(--surface-muted);
        }
        .badge {
          display: inline-flex;
          margin-left: 8px;
          border: 1px solid #9bd7cf;
          border-radius: 999px;
          background: var(--accent-soft);
          padding: 2px 8px;
          color: #075e56;
          font-size: 0.78rem;
          font-weight: 800;
        }
        pre {
          overflow-x: auto;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: #101827;
          padding: 16px;
          color: #f8fafc;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }
        .empty-state {
          border: 1px dashed var(--border);
          border-radius: 8px;
          background: var(--surface-muted);
          padding: 14px;
        }
        @media print {
          body { background: #ffffff; }
          main { width: 100%; padding: 0; }
          .report-hero, .report-section { box-shadow: none; break-inside: avoid; }
        }
        """
