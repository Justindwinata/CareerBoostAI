from careerboost_api.domain import TargetCriteria
from careerboost_api.services.resume_extraction import (
    ResumeTextExtractionError,
    ResumeTextExtractionResult,
)
from careerboost_api.services.resume_intake import ResumeIntakeOrchestrator
from careerboost_api.services.resume_upload import ValidatedResumeUpload

UNSAFE_GUIDANCE_PHRASES = (
    "guaranteed acceptance",
    "guaranteed interview",
    "guaranteed ats pass",
    "best candidate",
    "ideal candidate",
    "definitely qualified",
    "will be accepted",
    "hiring probability",
    "candidate quality score",
    "fit score",
    "pass/fail decision",
)


def build_upload() -> ValidatedResumeUpload:
    return ValidatedResumeUpload(
        filename="resume.pdf",
        content_type="application/pdf",
        size_bytes=4096,
    )


def build_analysis(
    *,
    text: str,
    target_criteria: TargetCriteria | None = None,
    confidence: str = "medium",
) -> object:
    orchestrator = ResumeIntakeOrchestrator()
    return orchestrator.build_success(
        upload=build_upload(),
        extraction=ResumeTextExtractionResult(
            extracted_text=text,
            confidence=confidence,
            character_count=len(text),
            page_count=1,
        ),
        target_criteria=target_criteria,
    )


def recommendation_ids(analysis: object) -> list[str]:
    return [item.identifier for item in analysis.recommendations.items]


def recommendation_text(analysis: object) -> str:
    return " ".join(
        " ".join(
            [
                item.identifier,
                item.title,
                item.description,
                item.actionable_next_step,
                item.boundary_note or "",
            ]
        )
        for item in analysis.recommendations.items
    )


def test_recommendation_service_generates_missing_section_guidance() -> None:
    analysis = build_analysis(
        text=("Summary\nStudent developer.\nSkills\nPython FastAPI\nProjects\nCareerBoost AI")
    )

    assert analysis.recommendations.status == "recommendations_ready"
    assert "resume-structure-missing-experience" in recommendation_ids(analysis)
    assert "resume-structure-missing-education" in recommendation_ids(analysis)


def test_indonesian_aliases_do_not_trigger_missing_target_section_guidance() -> None:
    analysis = build_analysis(
        text=(
            "Profil\n"
            "Mahasiswa teknik informatika.\n"
            "Kemampuan Utama\n"
            "Python SQL React\n"
            "Pengalaman Kerja\n"
            "IT Support Intern.\n"
            "Pendidikan\n"
            "S1 Teknik Informatika.\n"
            "Sertifikasi\n"
            "Network fundamentals.\n"
            "Portofolio\n"
            "Dashboard analitik."
        ),
        target_criteria=TargetCriteria(required_sections=["certifications"]),
    )

    assert "target-required-section-missing-certifications" not in recommendation_ids(analysis)


def test_required_and_preferred_target_skill_gaps_generate_prioritized_guidance() -> None:
    analysis = build_analysis(
        text=(
            "Summary\n"
            "Student developer.\n"
            "Skills\n"
            "Python React\n"
            "Experience\n"
            "Web project work.\n"
            "Education\n"
            "Computer Science.\n"
            "Projects\n"
            "Portfolio app."
        ),
        target_criteria=TargetCriteria(
            required_skills=["Rust"],
            preferred_skills=["Docker"],
        ),
    )

    items_by_id = {item.identifier: item for item in analysis.recommendations.items}

    assert items_by_id["target-required-skill-missing-rust"].priority == "high"
    assert items_by_id["target-preferred-skill-missing-docker"].priority == "low"


def test_missing_required_target_section_generates_guidance() -> None:
    analysis = build_analysis(
        text=(
            "Summary\n"
            "Student developer.\n"
            "Skills\n"
            "Python React\n"
            "Experience\n"
            "Web project work.\n"
            "Education\n"
            "Computer Science.\n"
            "Projects\n"
            "Portfolio app."
        ),
        target_criteria=TargetCriteria(required_sections=["certifications"]),
    )

    assert "target-required-section-missing-certifications" in recommendation_ids(analysis)


def test_no_explicit_skill_signals_generates_skill_visibility_guidance() -> None:
    analysis = build_analysis(
        text=(
            "Summary\n"
            "Student developer.\n"
            "Skills\n"
            "Communication and documentation.\n"
            "Experience\n"
            "Campus team member.\n"
            "Education\n"
            "Computer Science.\n"
            "Projects\n"
            "Portfolio presentation."
        )
    )

    assert "skill-visibility-no-explicit-signals" in recommendation_ids(analysis)


def test_role_signal_gaps_generate_safe_guidance() -> None:
    analysis = build_analysis(
        text=(
            "Summary\n"
            "Student developer.\n"
            "Skills\n"
            "Python\n"
            "Experience\n"
            "Backend project work.\n"
            "Education\n"
            "Computer Science.\n"
            "Projects\n"
            "API portfolio."
        )
    )

    assert any(
        identifier.startswith("role-signal-gap-") for identifier in recommendation_ids(analysis)
    )
    assert "unsuitable" not in recommendation_text(analysis).casefold()


def test_ats_and_extraction_quality_warnings_generate_guidance() -> None:
    analysis = build_analysis(
        text=(
            "Sertifikasi\n"
            "Network fundamentals\n"
            "Profil\n"
            "Student developer\n"
            "Alex Morgan\n"
            "Kemampuan Utama\n"
            "Python SQL"
        )
    )

    ids = recommendation_ids(analysis)

    assert "document-quality-unusual_section_order" in ids
    assert "document-quality-short_section_content" in ids
    assert "ats-character-count-600" in ids


def test_recommendations_have_no_duplicates_and_are_deterministically_ordered() -> None:
    analysis = build_analysis(
        text=("Summary\nStudent developer.\nSkills\nPython React\nProjects\nPortfolio app."),
        target_criteria=TargetCriteria(required_skills=["Rust"]),
    )
    identifiers = recommendation_ids(analysis)
    priorities = [item.priority for item in analysis.recommendations.items]

    assert len(identifiers) == len(set(identifiers))
    assert priorities == sorted(priorities, key={"high": 0, "medium": 1, "low": 2}.get)


def test_recommendations_do_not_include_unsafe_wording_or_score_fields() -> None:
    analysis = build_analysis(
        text=("Summary\nStudent developer.\nSkills\nPython React\nProjects\nPortfolio app.")
    )

    normalized_text = recommendation_text(analysis).casefold()

    assert all(phrase not in normalized_text for phrase in UNSAFE_GUIDANCE_PHRASES)
    assert all("score" not in item.model_dump() for item in analysis.recommendations.items)


def test_no_recommendations_state_works_when_no_rules_trigger() -> None:
    long_text = (
        "Summary\n"
        "Student developer with explicit technical project evidence.\n"
        "Skills\n"
        "Python FastAPI SQL React TypeScript CSS PostgreSQL Git\n"
        "Experience\n"
        "Built and maintained academic web applications with API integrations.\n"
        "Education\n"
        "Computer Science coursework with software engineering projects.\n"
        "Projects\n"
        "CareerBoost AI portfolio platform with backend, frontend, database, and tests.\n"
    )
    long_text = long_text + ("Additional project evidence. " * 20)

    analysis = build_analysis(text=long_text, confidence="high")

    assert analysis.recommendations.status == "no_recommendations"
    assert analysis.recommendations.items == []


def test_insufficient_data_state_works_for_extraction_failure() -> None:
    contract = ResumeIntakeOrchestrator().build_extraction_failure(
        upload=build_upload(),
        error=ResumeTextExtractionError(
            "Resume text is too short to analyze. Upload a text-based PDF resume."
        ),
    )

    assert contract.recommendations.status == "insufficient_data"
    assert contract.recommendations.items == []
