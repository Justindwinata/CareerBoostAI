import pytest
from pydantic import ValidationError

from careerboost_api.domain import (
    SkillSignal,
    SkillSignalEvidence,
    SkillSignalsContract,
)


def test_skill_signals_contract_represents_explicit_mentions() -> None:
    contract = SkillSignalsContract(
        status="signals_detected",
        signals=[
            SkillSignal(
                name="Python",
                category="programming_language",
                evidence=[
                    SkillSignalEvidence(
                        matched_text="Python",
                        source_area="skills",
                        line_number=4,
                        evidence_text="Python, FastAPI, React",
                    )
                ],
            )
        ],
    )

    assert contract.status == "signals_detected"
    assert contract.source == "deterministic_normalized_text"
    assert contract.signals[0].name == "Python"
    assert contract.signals[0].evidence_level == "explicit_mention"
    assert contract.signals[0].evidence[0].source_area == "skills"


def test_skill_signals_contract_allows_no_signal_fallback() -> None:
    contract = SkillSignalsContract(status="no_signals")

    assert contract.status == "no_signals"
    assert contract.signals == []


def test_skill_signals_contract_rejects_detected_status_without_signals() -> None:
    with pytest.raises(ValidationError):
        SkillSignalsContract(status="signals_detected")


def test_skill_signals_contract_rejects_fallback_state_with_signals() -> None:
    with pytest.raises(ValidationError):
        SkillSignalsContract(
            status="not_evaluated",
            signals=[
                SkillSignal(
                    name="Python",
                    category="programming_language",
                    evidence=[
                        SkillSignalEvidence(
                            matched_text="Python",
                            source_area="document",
                            line_number=1,
                            evidence_text="Python",
                        )
                    ],
                )
            ],
        )


def test_skill_signal_rejects_missing_evidence() -> None:
    with pytest.raises(ValidationError):
        SkillSignal(
            name="Python",
            category="programming_language",
            evidence=[],
        )
