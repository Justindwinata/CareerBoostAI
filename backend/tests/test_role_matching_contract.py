import pytest
from pydantic import ValidationError

from careerboost_api.domain import RoleMatchCandidate, RoleMatchesContract


def test_role_matches_contract_represents_metadata_ready_candidates() -> None:
    contract = RoleMatchesContract(
        status="metadata_ready",
        candidates=[
            RoleMatchCandidate(
                role_name="Backend Developer Intern",
                match_status="partial_match",
                confidence_state="metadata_ready",
                deterministic_evidence=["Explicit required skill signal detected: Python"],
                matched_skill_signals=["Python"],
                missing_required_signals=["FastAPI", "SQL"],
                supporting_sections=["skills", "projects"],
            )
        ],
    )

    assert contract.status == "metadata_ready"
    assert contract.source == "deterministic_resume_metadata"
    assert contract.candidates[0].role_name == "Backend Developer Intern"
    assert contract.candidates[0].match_status == "partial_match"


def test_role_matches_contract_allows_not_evaluated_without_candidates() -> None:
    contract = RoleMatchesContract(status="not_evaluated")

    assert contract.status == "not_evaluated"
    assert contract.candidates == []


def test_role_matches_contract_rejects_ready_status_without_candidates() -> None:
    with pytest.raises(ValidationError):
        RoleMatchesContract(status="metadata_ready")


def test_role_matches_contract_rejects_candidates_for_not_evaluated_state() -> None:
    with pytest.raises(ValidationError):
        RoleMatchesContract(
            status="not_evaluated",
            candidates=[
                RoleMatchCandidate(
                    role_name="Backend Developer Intern",
                    match_status="insufficient_data",
                    confidence_state="insufficient_data",
                    deterministic_evidence=[
                        "No explicit skill signals were available for role matching."
                    ],
                    matched_skill_signals=[],
                    missing_required_signals=["Python"],
                    supporting_sections=[],
                )
            ],
        )


def test_role_match_candidate_rejects_ready_state_with_insufficient_match() -> None:
    with pytest.raises(ValidationError):
        RoleMatchCandidate(
            role_name="Backend Developer Intern",
            match_status="insufficient_data",
            confidence_state="metadata_ready",
            deterministic_evidence=["Explicit required skill signal detected: Python"],
            matched_skill_signals=["Python"],
            missing_required_signals=[],
            supporting_sections=[],
        )
