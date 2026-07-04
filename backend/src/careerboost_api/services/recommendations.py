"""Deterministic improvement guidance generation from existing analysis metadata."""

from dataclasses import dataclass

from careerboost_api.domain import (
    AtsFeedbackContract,
    RecommendationEvidence,
    RecommendationItem,
    RecommendationsContract,
    RecommendationSourceMetadata,
    ResumeCompletenessContract,
    ResumeExtractionContract,
    ResumeSectionName,
    RoleMatchesContract,
    SkillSignalsContract,
    TargetAlignmentContract,
    TargetCriteria,
)

PRIORITY_ORDER = {"high": 0, "medium": 1, "low": 2}
CATEGORY_ORDER = {
    "resume_structure": 0,
    "document_quality": 1,
    "target_alignment": 2,
    "skill_visibility": 3,
    "ats_compatibility": 4,
    "role_signal_gap": 5,
}


@dataclass(frozen=True)
class RecommendationDraft:
    """Internal deterministic guidance draft before strict domain validation."""

    identifier: str
    category: str
    title: str
    description: str
    priority: str
    source_type: str
    source_id: str
    evidence_summary: str
    pipeline_stage: str
    signal: str
    actionable_next_step: str
    boundary_note: str | None = None


class RecommendationService:
    """Generate advisory improvement guidance without AI, scoring, ranking, or predictions."""

    def generate(
        self,
        *,
        extraction: ResumeExtractionContract,
        completeness: ResumeCompletenessContract | None,
        target_criteria: TargetCriteria,
        target_alignment: TargetAlignmentContract,
        ats: AtsFeedbackContract,
        skills: SkillSignalsContract,
        roles: RoleMatchesContract,
    ) -> RecommendationsContract:
        """Return deterministic improvement guidance from existing metadata only."""
        if extraction.status != "extracted" or completeness is None:
            return RecommendationsContract(status="insufficient_data")

        drafts = [
            *self._build_resume_structure_guidance(completeness),
            *self._build_target_alignment_guidance(
                target_criteria=target_criteria,
                target_alignment=target_alignment,
            ),
            *self._build_skill_visibility_guidance(
                extraction=extraction,
                completeness=completeness,
                skills=skills,
                target_alignment=target_alignment,
            ),
            *self._build_ats_guidance(ats),
            *self._build_document_quality_guidance(extraction),
            *self._build_role_signal_guidance(roles),
        ]
        items = [self._to_item(draft) for draft in self._dedupe_and_sort(drafts)]

        if not items:
            return RecommendationsContract(status="no_recommendations")

        return RecommendationsContract(status="recommendations_ready", items=items)

    def _build_resume_structure_guidance(
        self,
        completeness: ResumeCompletenessContract,
    ) -> list[RecommendationDraft]:
        drafts: list[RecommendationDraft] = []
        for section in completeness.missing_sections:
            drafts.append(
                RecommendationDraft(
                    identifier=f"resume-structure-missing-{section}",
                    category="resume_structure",
                    title=f"Make the {self._format_section(section)} section easier to identify",
                    description=(
                        f"The deterministic section detector did not identify a "
                        f"{self._format_section(section)} section in the extracted resume text."
                    ),
                    priority="high",
                    source_type="missing_expected_section",
                    source_id=f"section:{section}",
                    evidence_summary=(
                        f"The completeness baseline marks {self._format_section(section)} "
                        "as missing."
                    ),
                    pipeline_stage="completeness",
                    signal=f"missing_section:{section}",
                    actionable_next_step=(
                        f"Consider adding a clearly labeled {self._format_section(section)} "
                        "section."
                    ),
                    boundary_note=(
                        "This guidance is based only on deterministic section metadata."
                    ),
                )
            )

        return drafts

    def _build_target_alignment_guidance(
        self,
        *,
        target_criteria: TargetCriteria,
        target_alignment: TargetAlignmentContract,
    ) -> list[RecommendationDraft]:
        if target_criteria.status != "provided" or target_alignment.status != "evaluated":
            return []

        drafts: list[RecommendationDraft] = []
        for item in target_alignment.required_skills:
            if item.status != "not_found":
                continue
            drafts.append(
                RecommendationDraft(
                    identifier=f"target-required-skill-missing-{self._slug(item.normalized_skill)}",
                    category="skill_visibility",
                    title=f"Explicitly mention {item.submitted_skill} if it is relevant",
                    description=(
                        f"The submitted target criteria include {item.submitted_skill}, but "
                        "the extracted resume evidence does not explicitly show that skill."
                    ),
                    priority="high",
                    source_type="target_alignment_metadata",
                    source_id=f"required_skill:{item.normalized_skill}",
                    evidence_summary=(f"Required target skill not found: {item.submitted_skill}."),
                    pipeline_stage="target_alignment",
                    signal=f"required_skill:not_found:{item.normalized_skill}",
                    actionable_next_step=(
                        f"If accurate, explicitly mention {item.submitted_skill} in a skills, "
                        "project, or experience bullet."
                    ),
                    boundary_note=(
                        "This guidance does not infer whether the candidate has the skill."
                    ),
                )
            )

        for item in target_alignment.preferred_skills:
            if item.status != "not_found":
                continue
            drafts.append(
                RecommendationDraft(
                    identifier=f"target-preferred-skill-missing-{self._slug(item.normalized_skill)}",
                    category="skill_visibility",
                    title=f"Clarify optional evidence for {item.submitted_skill}",
                    description=(
                        f"The preferred target criteria include {item.submitted_skill}, but "
                        "the extracted resume evidence does not explicitly show it."
                    ),
                    priority="low",
                    source_type="target_alignment_metadata",
                    source_id=f"preferred_skill:{item.normalized_skill}",
                    evidence_summary=(f"Preferred target skill not found: {item.submitted_skill}."),
                    pipeline_stage="target_alignment",
                    signal=f"preferred_skill:not_found:{item.normalized_skill}",
                    actionable_next_step=(
                        "If relevant, consider adding explicit evidence for "
                        f"{item.submitted_skill}."
                    ),
                    boundary_note="Preferred criteria are optional context, not required gaps.",
                )
            )

        for item in target_alignment.required_sections:
            if item.status != "missing":
                continue
            drafts.append(
                RecommendationDraft(
                    identifier=f"target-required-section-missing-{item.section}",
                    category="resume_structure",
                    title=f"Add a clearly labeled {item.display_label} section",
                    description=(
                        f"The target criteria require {item.display_label}, but that section "
                        "was not detected in the extracted resume headings."
                    ),
                    priority="high",
                    source_type="target_alignment_metadata",
                    source_id=f"required_section:{item.section}",
                    evidence_summary=f"Required target section missing: {item.display_label}.",
                    pipeline_stage="target_alignment",
                    signal=f"required_section:missing:{item.section}",
                    actionable_next_step=(
                        f"Consider adding a clear {item.display_label} heading if the resume "
                        "contains that evidence."
                    ),
                    boundary_note=(
                        "Detected Indonesian and English heading aliases are treated as present."
                    ),
                )
            )

        for item in target_alignment.analysis_priorities:
            if item.status != "not_evaluated":
                continue
            drafts.append(
                RecommendationDraft(
                    identifier=f"target-priority-not-evaluated-{item.priority}",
                    category="resume_content",
                    title=f"Provide clearer evidence for {item.display_label}",
                    description=(
                        f"The selected analysis priority {item.display_label} could not be "
                        "evaluated from available deterministic metadata."
                    ),
                    priority="medium",
                    source_type="target_alignment_metadata",
                    source_id=f"priority:{item.priority}",
                    evidence_summary=f"Priority not evaluated: {item.display_label}.",
                    pipeline_stage="target_alignment",
                    signal=f"priority:not_evaluated:{item.priority}",
                    actionable_next_step=(
                        "Review the related resume section and make the evidence easier to "
                        "identify with explicit headings or bullet points."
                    ),
                    boundary_note="This guidance does not interpret the quality of the evidence.",
                )
            )

        if target_alignment.target_role.status == "not_mapped_to_controlled_profile":
            drafts.append(
                RecommendationDraft(
                    identifier="target-role-not-mapped-to-controlled-profile",
                    category="role_signal_gap",
                    title="Use a target role that maps to a controlled role profile",
                    description=(
                        "The submitted target role was not mapped to an existing deterministic "
                        "internship role profile."
                    ),
                    priority="medium",
                    source_type="target_alignment_metadata",
                    source_id="target_role:not_mapped",
                    evidence_summary=(
                        f"Target role not mapped: {target_alignment.target_role.target_role}."
                    ),
                    pipeline_stage="target_alignment",
                    signal="target_role:not_mapped_to_controlled_profile",
                    actionable_next_step=(
                        "Consider using a more specific role title that matches the available "
                        "internship role profiles."
                    ),
                    boundary_note=(
                        "This is a metadata mapping limitation, not a candidate judgment."
                    ),
                )
            )

        return drafts

    def _build_skill_visibility_guidance(
        self,
        *,
        extraction: ResumeExtractionContract,
        completeness: ResumeCompletenessContract,
        skills: SkillSignalsContract,
        target_alignment: TargetAlignmentContract,
    ) -> list[RecommendationDraft]:
        drafts: list[RecommendationDraft] = []
        if skills.status == "no_signals":
            drafts.append(
                RecommendationDraft(
                    identifier="skill-visibility-no-explicit-signals",
                    category="skill_visibility",
                    title="Make explicit skills easier to find",
                    description=(
                        "No explicit skill signals were detected in the extracted resume text."
                    ),
                    priority="medium",
                    source_type="explicit_skill_signal",
                    source_id="skills:no_signals",
                    evidence_summary="Skill signal extraction returned no explicit signals.",
                    pipeline_stage="skill_signals",
                    signal="skill_signals:no_signals",
                    actionable_next_step=(
                        "Consider adding a clearly labeled skills section with explicit tools, "
                        "technologies, and programming languages."
                    ),
                    boundary_note="This guidance does not infer skills from unstated experience.",
                )
            )

        present_sections = {section.name for section in extraction.sections}
        if (
            skills.status == "signals_detected"
            and "skills" not in present_sections
            and "skills" in completeness.missing_sections
        ):
            drafts.append(
                RecommendationDraft(
                    identifier="skill-visibility-signals-without-skills-section",
                    category="skill_visibility",
                    title="Group explicit skills under a recognizable skills heading",
                    description=(
                        "Explicit skill signals were detected, but the skills section itself "
                        "was not detected."
                    ),
                    priority="medium",
                    source_type="detected_section_structure",
                    source_id="section:skills:not_detected",
                    evidence_summary=(
                        "Skill signals exist outside a detected Skills, Kemampuan, or Keahlian "
                        "section."
                    ),
                    pipeline_stage="skill_signals",
                    signal="skills_section:missing_with_signals",
                    actionable_next_step=(
                        "Consider grouping explicit skills under a clear Skills, Kemampuan, "
                        "or Keahlian heading."
                    ),
                    boundary_note=(
                        "Indonesian and English skills-heading aliases are recognized when present."
                    ),
                )
            )

        if (
            target_alignment.status == "evaluated"
            and target_alignment.summary.required_skills_missing > 0
        ):
            # Required target-skill guidance is generated in target alignment rules.
            return drafts

        return drafts

    def _build_ats_guidance(self, ats: AtsFeedbackContract) -> list[RecommendationDraft]:
        drafts: list[RecommendationDraft] = []
        for issue in ats.issues:
            if issue.category == "keyword_coverage_placeholder":
                continue

            priority = "medium" if issue.severity == "warning" else "low"
            drafts.append(
                RecommendationDraft(
                    identifier=f"ats-{self._slug(issue.observed_signal)}",
                    category="ats_compatibility",
                    title=f"Review ATS metadata: {issue.title}",
                    description=issue.description,
                    priority=priority,
                    source_type="deterministic_ats_issue",
                    source_id=issue.observed_signal,
                    evidence_summary=(
                        f"{issue.category} issue observed from deterministic ATS metadata."
                    ),
                    pipeline_stage="ats_feedback",
                    signal=issue.observed_signal,
                    actionable_next_step=(
                        "Review this metadata issue and make the related resume structure "
                        "easier to identify."
                    ),
                    boundary_note="ATS metadata is not a numeric ATS score.",
                )
            )

        return drafts

    def _build_document_quality_guidance(
        self,
        extraction: ResumeExtractionContract,
    ) -> list[RecommendationDraft]:
        drafts: list[RecommendationDraft] = []
        if extraction.character_count < 600:
            drafts.append(
                RecommendationDraft(
                    identifier="document-quality-low-extracted-text",
                    category="document_quality",
                    title="Provide more readable extracted resume text",
                    description=(
                        "The extracted resume text contains limited readable characters for "
                        "deterministic analysis."
                    ),
                    priority="high",
                    source_type="extraction_quality_metadata",
                    source_id="character_count:<600",
                    evidence_summary=f"Extracted character count: {extraction.character_count}.",
                    pipeline_stage="extraction",
                    signal="character_count:<600",
                    actionable_next_step=(
                        "Export the resume as a searchable PDF and avoid image-only text."
                    ),
                    boundary_note="This does not mean the resume is invalid.",
                )
            )

        if extraction.confidence == "medium":
            drafts.append(
                RecommendationDraft(
                    identifier="document-quality-medium-extraction-confidence",
                    category="document_quality",
                    title="Review the extracted text for completeness",
                    description=(
                        "Text was extracted, but extraction confidence was not at the highest "
                        "available deterministic level."
                    ),
                    priority="medium",
                    source_type="extraction_quality_metadata",
                    source_id="extraction_confidence:medium",
                    evidence_summary="Extraction confidence is medium.",
                    pipeline_stage="extraction",
                    signal="extraction_confidence:medium",
                    actionable_next_step=(
                        "Review the extracted text preview and simplify the PDF layout if "
                        "important content appears missing."
                    ),
                    boundary_note="This is an advisory extraction-quality signal.",
                )
            )

        for warning in extraction.quality_warnings:
            drafts.append(
                RecommendationDraft(
                    identifier=f"document-quality-{warning.category}",
                    category="document_quality",
                    title="Review extraction quality advisory",
                    description=warning.message,
                    priority="medium",
                    source_type="extraction_quality_metadata",
                    source_id=f"warning:{warning.category}",
                    evidence_summary=f"Extraction warning: {warning.category}.",
                    pipeline_stage="extraction",
                    signal=f"quality_warning:{warning.category}",
                    actionable_next_step=(
                        "Consider using a simpler single-column ATS-friendly layout if the "
                        "analysis output looks incomplete."
                    ),
                    boundary_note="This warning does not block analysis or invalidate the resume.",
                )
            )

        return drafts

    def _build_role_signal_guidance(
        self,
        roles: RoleMatchesContract,
    ) -> list[RecommendationDraft]:
        if roles.status not in {"metadata_ready", "insufficient_data"}:
            return []

        drafts: list[RecommendationDraft] = []
        for candidate in roles.candidates:
            for signal in candidate.missing_required_signals:
                drafts.append(
                    RecommendationDraft(
                        identifier=(
                            f"role-signal-gap-{self._slug(candidate.role_name)}-"
                            f"{self._slug(signal)}"
                        ),
                        category="role_signal_gap",
                        title=f"Clarify role signal for {candidate.role_name}",
                        description=(
                            "This resume does not explicitly show evidence for this role signal: "
                            f"{signal}."
                        ),
                        priority="medium",
                        source_type="missing_role_signal",
                        source_id=f"{candidate.role_name}:{signal}",
                        evidence_summary=(
                            f"Missing required signal for {candidate.role_name}: {signal}."
                        ),
                        pipeline_stage="role_matching",
                        signal=f"missing_role_signal:{candidate.role_name}:{signal}",
                        actionable_next_step=(
                            f"If accurate, explicitly mention {signal} in relevant skills, "
                            "project, or experience evidence."
                        ),
                        boundary_note=(
                            "Role metadata is deterministic and does not rank candidate fit."
                        ),
                    )
                )

        return drafts

    def _to_item(self, draft: RecommendationDraft) -> RecommendationItem:
        return RecommendationItem(
            identifier=draft.identifier,
            category=draft.category,
            title=draft.title,
            description=draft.description,
            priority=draft.priority,
            evidence=[
                RecommendationEvidence(
                    source_type=draft.source_type,
                    source_id=draft.source_id,
                    summary=draft.evidence_summary,
                )
            ],
            source_metadata=RecommendationSourceMetadata(
                pipeline_stage=draft.pipeline_stage,
                signal=draft.signal,
            ),
            actionable_next_step=draft.actionable_next_step,
            boundary_note=draft.boundary_note,
        )

    def _dedupe_and_sort(self, drafts: list[RecommendationDraft]) -> list[RecommendationDraft]:
        deduped: dict[str, RecommendationDraft] = {}
        for draft in drafts:
            deduped.setdefault(draft.identifier, draft)

        return sorted(
            deduped.values(),
            key=lambda draft: (
                PRIORITY_ORDER[draft.priority],
                CATEGORY_ORDER[draft.category],
                draft.identifier,
            ),
        )

    def _format_section(self, section: ResumeSectionName) -> str:
        return section.replace("_", " ").title()

    def _slug(self, value: str) -> str:
        normalized = "".join(
            character.casefold() if character.isalnum() else "-" for character in value.strip()
        )
        return "-".join(part for part in normalized.split("-") if part)
