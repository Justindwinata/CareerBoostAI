from careerboost_api.domain import (
    DetectedResumeSection,
    ResumeCompletenessContract,
    SkillSignal,
    SkillSignalEvidence,
    SkillSignalsContract,
)
from careerboost_api.services.role_matching import RoleMatchingService


def build_skill_signal(name: str) -> SkillSignal:
    return SkillSignal(
        name=name,
        category="framework" if name in {"FastAPI", "React"} else "programming_language",
        evidence=[
            SkillSignalEvidence(
                matched_text=name.lower(),
                source_area="skills",
                line_number=4,
                evidence_text=f"Skills include {name}",
            )
        ],
    )


def build_completeness() -> ResumeCompletenessContract:
    return ResumeCompletenessContract(
        expected_sections=["summary", "skills", "experience", "education", "projects"],
        present_sections=["summary", "skills", "projects"],
        missing_sections=["experience", "education"],
        score=0.6,
    )


def test_role_matching_service_maps_explicit_skills_to_role_candidates() -> None:
    service = RoleMatchingService()
    skills = SkillSignalsContract(
        status="signals_detected",
        signals=[
            build_skill_signal("Python"),
            build_skill_signal("FastAPI"),
            build_skill_signal("SQL"),
            build_skill_signal("React"),
            build_skill_signal("TypeScript"),
        ],
    )
    sections = [
        DetectedResumeSection(
            name="skills",
            heading="Technical Skills",
            start_line=3,
            end_line=4,
            content="Python, FastAPI, SQL, React, TypeScript",
        )
    ]

    result = service.match(skills=skills, sections=sections, completeness=build_completeness())

    assert result.status == "metadata_ready"
    assert [candidate.role_name for candidate in result.candidates] == [
        "Backend Developer Intern",
        "Frontend Developer Intern",
        "Full Stack Developer Intern",
        "Data Analyst Intern",
        "Machine Learning Intern",
    ]
    backend = result.candidates[0]
    assert backend.match_status == "matched"
    assert backend.confidence_state == "metadata_ready"
    assert backend.matched_skill_signals == ["Python", "FastAPI", "SQL"]
    assert backend.missing_required_signals == []
    assert "skills" in backend.supporting_sections

    frontend = result.candidates[1]
    assert frontend.match_status == "partial_match"
    assert frontend.matched_skill_signals == ["React", "TypeScript"]
    assert frontend.missing_required_signals == ["CSS"]


def test_role_matching_service_does_not_infer_missing_skills() -> None:
    service = RoleMatchingService()
    skills = SkillSignalsContract(
        status="signals_detected",
        signals=[build_skill_signal("Python")],
    )

    result = service.match(skills=skills, sections=[], completeness=build_completeness())

    backend = result.candidates[0]
    assert backend.match_status == "partial_match"
    assert backend.matched_skill_signals == ["Python"]
    assert backend.missing_required_signals == ["FastAPI", "SQL"]
    assert "FastAPI" not in backend.matched_skill_signals
    assert "SQL" not in backend.matched_skill_signals

    frontend = result.candidates[1]
    assert frontend.match_status == "not_matched"
    assert frontend.matched_skill_signals == []
    assert frontend.missing_required_signals == ["React", "TypeScript", "CSS"]


def test_role_matching_service_returns_insufficient_data_without_skill_signals() -> None:
    service = RoleMatchingService()
    skills = SkillSignalsContract(status="no_signals")

    result = service.match(skills=skills, sections=[], completeness=build_completeness())

    assert result.status == "insufficient_data"
    assert len(result.candidates) == 5
    assert all(candidate.match_status == "insufficient_data" for candidate in result.candidates)
    assert all(candidate.confidence_state == "insufficient_data" for candidate in result.candidates)


def test_role_matching_service_returns_not_evaluated_without_required_metadata() -> None:
    service = RoleMatchingService()
    skills = SkillSignalsContract(status="not_evaluated")

    result = service.match(skills=skills, sections=[], completeness=None)

    assert result.status == "not_evaluated"
    assert result.candidates == []
