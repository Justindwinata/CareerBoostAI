import json

import pytest
from pydantic import ValidationError

from careerboost_api.domain import (
    AlignmentEvidence,
    AtsFeedbackContract,
    AtsKeywordCoveragePlaceholder,
    AtsScorePlaceholder,
    DetectedResumeSection,
    ResumeCompletenessContract,
    ResumeExtractionContract,
    RoleMatchesContract,
    SkillSignal,
    SkillSignalEvidence,
    SkillSignalsContract,
    TargetAlignmentContract,
    TargetCriteria,
)
from careerboost_api.services.target_alignment import TargetAlignmentService


def build_extraction() -> ResumeExtractionContract:
    return ResumeExtractionContract(
        status="extracted",
        confidence="medium",
        character_count=180,
        page_count=1,
        extracted_text="Summary\nStudent developer\nSkills\nPython, React\nProjects\nAPI project",
        normalized_text="Summary\nStudent developer\nSkills\nPython, React\nProjects\nAPI project",
        sections=[
            DetectedResumeSection(
                name="summary",
                heading="Summary",
                start_line=1,
                end_line=2,
                content="Student developer",
            ),
            DetectedResumeSection(
                name="skills",
                heading="Skills",
                start_line=3,
                end_line=4,
                content="Python, React",
            ),
            DetectedResumeSection(
                name="projects",
                heading="Projects",
                start_line=5,
                end_line=6,
                content="API project",
            ),
        ],
    )


def build_completeness() -> ResumeCompletenessContract:
    return ResumeCompletenessContract(
        expected_sections=["summary", "skills", "experience", "education", "projects"],
        present_sections=["summary", "skills", "projects"],
        missing_sections=["experience", "education"],
        score=0.6,
    )


def build_skills() -> SkillSignalsContract:
    return SkillSignalsContract(
        status="signals_detected",
        signals=[
            SkillSignal(
                name="Python",
                category="programming_language",
                evidence=[
                    SkillSignalEvidence(
                        matched_text="python",
                        source_area="skills",
                        line_number=4,
                        evidence_text="Python, React",
                    )
                ],
            ),
            SkillSignal(
                name="React",
                category="framework",
                evidence=[
                    SkillSignalEvidence(
                        matched_text="react",
                        source_area="skills",
                        line_number=4,
                        evidence_text="Python, React",
                    )
                ],
            ),
        ],
    )


def build_ats() -> AtsFeedbackContract:
    return AtsFeedbackContract(
        status="metadata_ready",
        issues=[],
        keyword_coverage=AtsKeywordCoveragePlaceholder(),
        score=AtsScorePlaceholder(),
    )


def build_roles() -> RoleMatchesContract:
    return RoleMatchesContract(
        status="insufficient_data",
        candidates=[
            {
                "role_name": "Frontend Developer Intern",
                "match_status": "insufficient_data",
                "confidence_state": "insufficient_data",
                "deterministic_evidence": [
                    "No explicit skill signals were available for role matching."
                ],
                "matched_skill_signals": [],
                "missing_required_signals": ["React", "TypeScript", "CSS"],
                "supporting_sections": [],
            }
        ],
    )


def evaluate(criteria: TargetCriteria) -> TargetAlignmentContract:
    return TargetAlignmentService().evaluate(
        target_criteria=criteria,
        extraction=build_extraction(),
        completeness=build_completeness(),
        ats=build_ats(),
        skills=build_skills(),
        roles=build_roles(),
    )


def test_target_alignment_returns_not_provided_state() -> None:
    alignment = evaluate(TargetCriteria())

    assert alignment.status == "not_provided"
    assert alignment.required_skills == []
    assert alignment.required_sections == []
    assert alignment.target_role.status == "not_provided"


def test_target_alignment_evaluates_required_skills_found_and_missing() -> None:
    alignment = evaluate(TargetCriteria(required_skills=["React.js", "SQL"]))

    assert alignment.status == "evaluated"
    assert [item.submitted_skill for item in alignment.required_skills] == ["React.js", "SQL"]
    assert alignment.required_skills[0].normalized_skill == "react"
    assert [item.status for item in alignment.required_skills] == ["found", "not_found"]
    assert alignment.required_skills[0].evidence[0].source_type == "explicit_skill_signal"
    assert alignment.summary.required_skills_total == 2
    assert alignment.summary.required_skills_found == 1
    assert alignment.summary.required_skills_missing == 1


def test_target_alignment_evaluates_preferred_skills_without_required_gap_claims() -> None:
    alignment = evaluate(TargetCriteria(preferred_skills=["Python", "Docker"]))

    assert [item.category for item in alignment.preferred_skills] == ["preferred", "preferred"]
    assert [item.status for item in alignment.preferred_skills] == ["found", "not_found"]
    assert alignment.summary.preferred_skills_total == 2
    assert alignment.summary.preferred_skills_found == 1


def test_target_alignment_evaluates_required_sections_detected_and_missing() -> None:
    alignment = evaluate(TargetCriteria(required_sections=["summary", "certifications"]))

    assert [item.section for item in alignment.required_sections] == ["summary", "certifications"]
    assert [item.status for item in alignment.required_sections] == ["detected", "missing"]
    assert alignment.required_sections[0].evidence[0].source_type == "detected_resume_section"
    assert alignment.summary.required_sections_found == 1
    assert alignment.summary.required_sections_missing == 1


def test_target_alignment_evaluates_analysis_priorities() -> None:
    alignment = evaluate(
        TargetCriteria(
            analysis_priorities=[
                "resume_structure",
                "ats_compatibility",
                "skill_visibility",
                "role_alignment",
                "project_evidence",
                "education_fit",
            ]
        )
    )

    assert [item.status for item in alignment.analysis_priorities] == [
        "evaluated",
        "evaluated",
        "evaluated",
        "evaluated",
        "evaluated",
        "evaluated",
    ]
    assert alignment.summary.priorities_total == 6
    assert alignment.summary.priorities_evaluated == 6


def test_target_alignment_maps_exact_controlled_role_profile_only() -> None:
    mapped_alignment = evaluate(TargetCriteria(target_role="frontend developer intern"))
    unmapped_alignment = evaluate(TargetCriteria(target_role="Product Design Intern"))

    assert mapped_alignment.target_role.status == "mapped_to_controlled_profile"
    assert mapped_alignment.target_role.controlled_profile == "Frontend Developer Intern"
    assert unmapped_alignment.target_role.status == "not_mapped_to_controlled_profile"
    assert unmapped_alignment.target_role.controlled_profile is None


def test_target_alignment_returns_insufficient_data_for_failed_extraction() -> None:
    alignment = TargetAlignmentService().evaluate(
        target_criteria=TargetCriteria(required_skills=["Python"]),
        extraction=ResumeExtractionContract(
            status="failed",
            error={
                "category": "low_text",
                "message": "Resume text is too short to analyze. Upload a text-based PDF resume.",
            },
        ),
        completeness=None,
        ats=build_ats(),
        skills=build_skills(),
        roles=build_roles(),
    )

    assert alignment.status == "insufficient_data"
    assert alignment.required_skills == []
    assert "not enough readable resume evidence" in alignment.message


def test_target_alignment_allows_provided_context_without_alignable_items() -> None:
    alignment = evaluate(TargetCriteria(target_description="Review an internship description."))

    assert alignment.status == "evaluated"
    assert alignment.summary.required_skills_total == 0
    assert alignment.required_skills == []
    assert alignment.required_sections == []
    assert alignment.analysis_priorities == []
    assert alignment.target_role.status == "not_provided"


def test_target_alignment_contains_no_scoring_fields_or_unsafe_wording() -> None:
    alignment = evaluate(
        TargetCriteria(
            target_role="Frontend Developer Intern",
            required_skills=["React", "SQL"],
            required_sections=["summary", "certifications"],
        )
    )

    payload = json.dumps(alignment.model_dump(mode="json")).casefold()

    for forbidden_key in ["score", "percentage", "rank", "pass_fail"]:
        assert forbidden_key not in payload

    for unsafe_phrase in [
        "guaranteed acceptance",
        "guaranteed interview",
        "guaranteed ats pass",
        "best candidate",
        "ideal candidate",
        "hiring probability",
        "fit score",
        "pass/fail",
    ]:
        assert unsafe_phrase not in payload


def test_target_alignment_preserves_deterministic_ordering() -> None:
    alignment = evaluate(
        TargetCriteria(
            required_skills=["SQL", "React", "Python"],
            preferred_skills=["Docker", "React"],
            required_sections=["certifications", "skills", "summary"],
        )
    )

    assert [item.submitted_skill for item in alignment.required_skills] == [
        "SQL",
        "React",
        "Python",
    ]
    assert [item.submitted_skill for item in alignment.preferred_skills] == ["Docker", "React"]
    assert [item.section for item in alignment.required_sections] == [
        "certifications",
        "skills",
        "summary",
    ]


def test_target_alignment_contract_rejects_found_skill_without_evidence() -> None:
    with pytest.raises(ValidationError):
        TargetAlignmentContract(
            status="evaluated",
            required_skills=[
                {
                    "category": "required",
                    "submitted_skill": "React",
                    "normalized_skill": "react",
                    "status": "found",
                    "evidence": [],
                }
            ],
        )


def test_alignment_evidence_rejects_extra_fields() -> None:
    with pytest.raises(ValidationError):
        AlignmentEvidence(
            source_type="metadata_available",
            source_label="Metadata",
            detail="Metadata available.",
            unsupported="value",
        )
