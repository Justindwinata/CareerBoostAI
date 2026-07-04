"""Deterministic target criteria alignment from existing resume metadata."""

from careerboost_api.domain import (
    AlignmentEvidence,
    AnalysisStagePlaceholder,
    AtsFeedbackContract,
    DetectedResumeSection,
    PriorityAlignmentItem,
    ResumeCompletenessContract,
    ResumeExtractionContract,
    RoleMatchesContract,
    SectionAlignmentItem,
    SkillAlignmentCategory,
    SkillAlignmentItem,
    SkillSignal,
    SkillSignalsContract,
    TargetAlignmentContract,
    TargetAlignmentSummary,
    TargetAnalysisPriority,
    TargetCriteria,
    TargetRequiredSection,
    TargetRoleContext,
)
from careerboost_api.services.role_matching import ROLE_RULES
from careerboost_api.services.skill_signals import CONTROLLED_SKILLS

INSUFFICIENT_ALIGNMENT_MESSAGE = (
    "Target alignment could not be evaluated because there was not enough readable resume evidence."
)

SECTION_LABELS: dict[TargetRequiredSection, str] = {
    "summary": "Summary",
    "skills": "Skills",
    "experience": "Experience",
    "education": "Education",
    "projects": "Projects",
    "certifications": "Certifications",
}

PRIORITY_LABELS: dict[TargetAnalysisPriority, str] = {
    "resume_structure": "Resume structure",
    "ats_compatibility": "ATS compatibility",
    "skill_visibility": "Skill visibility",
    "role_alignment": "Role alignment",
    "project_evidence": "Project evidence",
    "education_fit": "Education fit",
}


class TargetAlignmentService:
    """Compare submitted target criteria with deterministic resume evidence."""

    def evaluate(
        self,
        *,
        target_criteria: TargetCriteria,
        extraction: ResumeExtractionContract,
        completeness: ResumeCompletenessContract | None,
        ats: AtsFeedbackContract | AnalysisStagePlaceholder,
        skills: SkillSignalsContract | AnalysisStagePlaceholder,
        roles: RoleMatchesContract | AnalysisStagePlaceholder,
    ) -> TargetAlignmentContract:
        if target_criteria.status == "not_provided":
            return TargetAlignmentContract()

        if extraction.status != "extracted" or completeness is None:
            return TargetAlignmentContract(
                status="insufficient_data",
                message=INSUFFICIENT_ALIGNMENT_MESSAGE,
            )

        if not isinstance(skills, SkillSignalsContract) or not isinstance(
            roles, RoleMatchesContract
        ):
            return TargetAlignmentContract(
                status="insufficient_data",
                message=INSUFFICIENT_ALIGNMENT_MESSAGE,
            )

        skill_index = {self._normalize_skill(signal.name): signal for signal in skills.signals}
        required_skills = [
            self._build_skill_alignment(
                submitted_skill=skill,
                category="required",
                skill_index=skill_index,
            )
            for skill in target_criteria.required_skills
        ]
        preferred_skills = [
            self._build_skill_alignment(
                submitted_skill=skill,
                category="preferred",
                skill_index=skill_index,
            )
            for skill in target_criteria.preferred_skills
        ]
        required_sections = [
            self._build_section_alignment(section_name, extraction.sections)
            for section_name in target_criteria.required_sections
        ]
        analysis_priorities = [
            self._build_priority_alignment(
                priority=priority,
                extraction=extraction,
                completeness=completeness,
                ats=ats,
                skills=skills,
                roles=roles,
            )
            for priority in target_criteria.analysis_priorities
        ]
        target_role = self._build_target_role_context(target_criteria.target_role)

        return TargetAlignmentContract(
            status="evaluated",
            summary=TargetAlignmentSummary(
                required_skills_total=len(required_skills),
                required_skills_found=sum(item.status == "found" for item in required_skills),
                required_skills_missing=sum(item.status == "not_found" for item in required_skills),
                preferred_skills_total=len(preferred_skills),
                preferred_skills_found=sum(item.status == "found" for item in preferred_skills),
                required_sections_total=len(required_sections),
                required_sections_found=sum(
                    item.status == "detected" for item in required_sections
                ),
                required_sections_missing=sum(
                    item.status == "missing" for item in required_sections
                ),
                priorities_total=len(analysis_priorities),
                priorities_evaluated=sum(
                    item.status == "evaluated" for item in analysis_priorities
                ),
            ),
            required_skills=required_skills,
            preferred_skills=preferred_skills,
            required_sections=required_sections,
            analysis_priorities=analysis_priorities,
            target_role=target_role,
            message="Target alignment metadata was evaluated from deterministic resume evidence.",
        )

    def _build_skill_alignment(
        self,
        *,
        submitted_skill: str,
        category: SkillAlignmentCategory,
        skill_index: dict[str, SkillSignal],
    ) -> SkillAlignmentItem:
        normalized_skill = self._normalize_skill(submitted_skill)
        matched_signal = skill_index.get(normalized_skill)

        if matched_signal is None:
            return SkillAlignmentItem(
                category=category,
                submitted_skill=submitted_skill,
                normalized_skill=normalized_skill,
                status="not_found",
            )

        return SkillAlignmentItem(
            category=category,
            submitted_skill=submitted_skill,
            normalized_skill=normalized_skill,
            status="found",
            evidence=[
                AlignmentEvidence(
                    source_type="explicit_skill_signal",
                    source_label=matched_signal.name,
                    source_area=evidence.source_area,
                    line_number=evidence.line_number,
                    detail=evidence.evidence_text,
                )
                for evidence in matched_signal.evidence
            ],
        )

    def _build_section_alignment(
        self,
        section_name: TargetRequiredSection,
        sections: list[DetectedResumeSection],
    ) -> SectionAlignmentItem:
        matched_section = next(
            (section for section in sections if section.name == section_name),
            None,
        )

        if matched_section is None:
            return SectionAlignmentItem(
                section=section_name,
                display_label=SECTION_LABELS[section_name],
                status="missing",
            )

        return SectionAlignmentItem(
            section=section_name,
            display_label=SECTION_LABELS[section_name],
            status="detected",
            evidence=[
                AlignmentEvidence(
                    source_type="detected_resume_section",
                    source_label=matched_section.heading,
                    source_area=matched_section.name,
                    line_number=matched_section.start_line,
                    detail=(
                        f"Detected heading on lines {matched_section.start_line}-"
                        f"{matched_section.end_line}."
                    ),
                )
            ],
        )

    def _build_priority_alignment(
        self,
        *,
        priority: TargetAnalysisPriority,
        extraction: ResumeExtractionContract,
        completeness: ResumeCompletenessContract,
        ats: AtsFeedbackContract | AnalysisStagePlaceholder,
        skills: SkillSignalsContract,
        roles: RoleMatchesContract,
    ) -> PriorityAlignmentItem:
        evidence = self._resolve_priority_evidence(
            priority=priority,
            extraction=extraction,
            completeness=completeness,
            ats=ats,
            skills=skills,
            roles=roles,
        )

        return PriorityAlignmentItem(
            priority=priority,
            display_label=PRIORITY_LABELS[priority],
            status="evaluated" if evidence else "not_evaluated",
            evidence=evidence,
        )

    def _resolve_priority_evidence(
        self,
        *,
        priority: TargetAnalysisPriority,
        extraction: ResumeExtractionContract,
        completeness: ResumeCompletenessContract,
        ats: AtsFeedbackContract | AnalysisStagePlaceholder,
        skills: SkillSignalsContract,
        roles: RoleMatchesContract,
    ) -> list[AlignmentEvidence]:
        if priority == "resume_structure":
            return [
                AlignmentEvidence(
                    source_type="metadata_available",
                    source_label="Completeness metadata",
                    detail=(
                        f"{len(completeness.present_sections)} detected expected sections and "
                        f"{len(completeness.missing_sections)} missing expected sections."
                    ),
                )
            ]

        if priority == "ats_compatibility" and isinstance(ats, AtsFeedbackContract):
            return [
                AlignmentEvidence(
                    source_type="metadata_available",
                    source_label="ATS metadata",
                    detail=f"{len(ats.issues)} deterministic ATS metadata items available.",
                )
            ]

        if priority == "skill_visibility":
            return [
                AlignmentEvidence(
                    source_type="metadata_available",
                    source_label="Skill signals metadata",
                    detail=f"Skill signal state: {skills.status}.",
                )
            ]

        if priority == "role_alignment":
            return [
                AlignmentEvidence(
                    source_type="metadata_available",
                    source_label="Role matching metadata",
                    detail=f"Role matching state: {roles.status}.",
                )
            ]

        if priority == "project_evidence":
            return [
                AlignmentEvidence(
                    source_type="metadata_available",
                    source_label="Projects section check",
                    detail=self._section_presence_detail("projects", extraction.sections),
                )
            ]

        if priority == "education_fit":
            return [
                AlignmentEvidence(
                    source_type="metadata_available",
                    source_label="Education section check",
                    detail=self._section_presence_detail("education", extraction.sections),
                )
            ]

        return []

    def _build_target_role_context(self, target_role: str) -> TargetRoleContext:
        normalized_target_role = target_role.strip()
        if not normalized_target_role:
            return TargetRoleContext()

        controlled_role = next(
            (
                rule.role_name
                for rule in ROLE_RULES
                if rule.role_name.casefold() == normalized_target_role.casefold()
            ),
            None,
        )

        if controlled_role is None:
            return TargetRoleContext(
                status="not_mapped_to_controlled_profile",
                target_role=normalized_target_role,
            )

        return TargetRoleContext(
            status="mapped_to_controlled_profile",
            target_role=normalized_target_role,
            controlled_profile=controlled_role,
            evidence=[
                AlignmentEvidence(
                    source_type="controlled_role_profile",
                    source_label=controlled_role,
                    detail=(
                        "Target role matched a controlled internship role profile by exact name."
                    ),
                )
            ],
        )

    def _section_presence_detail(
        self,
        section_name: str,
        sections: list[DetectedResumeSection],
    ) -> str:
        return (
            f"{section_name} section detected."
            if any(section.name == section_name for section in sections)
            else f"{section_name} section was not detected."
        )

    def _normalize_skill(self, skill: str) -> str:
        normalized_skill = skill.strip().casefold()

        for controlled_skill in CONTROLLED_SKILLS:
            controlled_terms = (controlled_skill.name, *controlled_skill.aliases)
            if normalized_skill in {term.casefold() for term in controlled_terms}:
                return controlled_skill.name.casefold()

        return normalized_skill
