import pytest
from pydantic import ValidationError

from careerboost_api.domain import TargetCriteria


def test_target_criteria_allows_empty_object() -> None:
    criteria = TargetCriteria()

    assert criteria.status == "not_provided"
    assert criteria.target_role == ""
    assert criteria.required_skills == []
    assert criteria.required_sections == []
    assert criteria.analysis_priorities == []


def test_target_criteria_normalizes_valid_values() -> None:
    criteria = TargetCriteria(
        target_role="  Frontend Developer Intern  ",
        target_description="  Build React interfaces.  ",
        required_skills=[" React ", "react", "SQL", ""],
        preferred_skills=["Docker", " docker ", "PostgreSQL"],
        required_sections=["summary", "skills", "projects", "summary"],
        analysis_priorities=["resume_structure", "skill_visibility", "resume_structure"],
        experience_expectation="  Internship level  ",
        education_expectation="  Computer Science or related field preferred  ",
        notes="  Review explicit project evidence.  ",
    )

    assert criteria.status == "provided"
    assert criteria.target_role == "Frontend Developer Intern"
    assert criteria.target_description == "Build React interfaces."
    assert criteria.required_skills == ["React", "SQL"]
    assert criteria.preferred_skills == ["Docker", "PostgreSQL"]
    assert criteria.required_sections == ["summary", "skills", "projects"]
    assert criteria.analysis_priorities == ["resume_structure", "skill_visibility"]
    assert criteria.experience_expectation == "Internship level"
    assert criteria.education_expectation == "Computer Science or related field preferred"
    assert criteria.notes == "Review explicit project evidence."


def test_target_criteria_enforces_field_length_limits() -> None:
    with pytest.raises(ValidationError):
        TargetCriteria(target_role="x" * 121)

    with pytest.raises(ValidationError):
        TargetCriteria(notes="x" * 1001)

    with pytest.raises(ValidationError):
        TargetCriteria(required_skills=["x" * 81])


def test_target_criteria_enforces_list_limits() -> None:
    with pytest.raises(ValidationError):
        TargetCriteria(required_skills=[f"skill-{index}" for index in range(31)])

    with pytest.raises(ValidationError):
        TargetCriteria(preferred_skills=[f"skill-{index}" for index in range(31)])


def test_target_criteria_rejects_extra_fields() -> None:
    with pytest.raises(ValidationError):
        TargetCriteria(unsupported_field="value")


def test_target_criteria_rejects_unknown_options() -> None:
    with pytest.raises(ValidationError):
        TargetCriteria(required_sections=["portfolio"])

    with pytest.raises(ValidationError):
        TargetCriteria(analysis_priorities=["hiring_probability"])
