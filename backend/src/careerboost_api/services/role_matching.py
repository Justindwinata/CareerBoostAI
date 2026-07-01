"""Deterministic internship role matching from existing resume metadata."""

from dataclasses import dataclass

from careerboost_api.domain import (
    DetectedResumeSection,
    InternshipRoleName,
    ResumeCompletenessContract,
    ResumeSectionName,
    RoleMatchCandidate,
    RoleMatchesContract,
    SkillSignalsContract,
)


@dataclass(frozen=True)
class RoleRule:
    """Explicit deterministic skill requirements for one internship role."""

    role_name: InternshipRoleName
    required_skills: tuple[str, ...]
    supporting_sections: tuple[ResumeSectionName, ...]


ROLE_RULES: tuple[RoleRule, ...] = (
    RoleRule(
        role_name="Backend Developer Intern",
        required_skills=("Python", "FastAPI", "SQL"),
        supporting_sections=("skills", "projects", "experience"),
    ),
    RoleRule(
        role_name="Frontend Developer Intern",
        required_skills=("React", "TypeScript", "CSS"),
        supporting_sections=("skills", "projects", "experience"),
    ),
    RoleRule(
        role_name="Full Stack Developer Intern",
        required_skills=("React", "TypeScript", "FastAPI", "SQL"),
        supporting_sections=("skills", "projects", "experience"),
    ),
    RoleRule(
        role_name="Data Analyst Intern",
        required_skills=("Python", "SQL"),
        supporting_sections=("skills", "projects", "education"),
    ),
    RoleRule(
        role_name="Machine Learning Intern",
        required_skills=("Python", "SQL"),
        supporting_sections=("skills", "projects", "education"),
    ),
)


class RoleMatchingService:
    """Map explicit skill signals into non-ranked internship role candidates."""

    def match(
        self,
        *,
        skills: SkillSignalsContract,
        sections: list[DetectedResumeSection],
        completeness: ResumeCompletenessContract | None,
    ) -> RoleMatchesContract:
        if skills.status == "not_evaluated" or completeness is None:
            return RoleMatchesContract(status="not_evaluated")

        if skills.status == "no_signals":
            return RoleMatchesContract(
                status="insufficient_data",
                candidates=[self._build_insufficient_data_candidate(rule) for rule in ROLE_RULES],
            )

        skill_names = {signal.name for signal in skills.signals}
        present_sections = {section.name for section in sections}
        completeness_sections = set(completeness.present_sections)

        return RoleMatchesContract(
            status="metadata_ready",
            candidates=[
                self._build_metadata_ready_candidate(
                    rule=rule,
                    skill_names=skill_names,
                    present_sections=present_sections | completeness_sections,
                )
                for rule in ROLE_RULES
            ],
        )

    def _build_metadata_ready_candidate(
        self,
        *,
        rule: RoleRule,
        skill_names: set[str],
        present_sections: set[ResumeSectionName],
    ) -> RoleMatchCandidate:
        matched_skills = [skill for skill in rule.required_skills if skill in skill_names]
        missing_skills = [skill for skill in rule.required_skills if skill not in skill_names]
        supporting_sections = [
            section for section in rule.supporting_sections if section in present_sections
        ]

        if not matched_skills:
            match_status = "not_matched"
        elif missing_skills:
            match_status = "partial_match"
        else:
            match_status = "matched"

        evidence = [f"Explicit required skill signal detected: {skill}" for skill in matched_skills]
        evidence.extend(
            f"Supporting resume section detected: {section}" for section in supporting_sections
        )

        if not evidence:
            evidence = ["No required skill signals detected for this role."]

        return RoleMatchCandidate(
            role_name=rule.role_name,
            match_status=match_status,
            confidence_state="metadata_ready",
            deterministic_evidence=evidence,
            matched_skill_signals=matched_skills,
            missing_required_signals=missing_skills,
            supporting_sections=supporting_sections,
        )

    def _build_insufficient_data_candidate(self, rule: RoleRule) -> RoleMatchCandidate:
        return RoleMatchCandidate(
            role_name=rule.role_name,
            match_status="insufficient_data",
            confidence_state="insufficient_data",
            deterministic_evidence=["No explicit skill signals were available for role matching."],
            matched_skill_signals=[],
            missing_required_signals=list(rule.required_skills),
            supporting_sections=[],
        )
