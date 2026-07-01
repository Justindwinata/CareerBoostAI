from careerboost_api.domain import DetectedResumeSection
from careerboost_api.services.skill_signals import SkillSignalExtractor


def build_section(
    name: str,
    *,
    start_line: int,
    end_line: int,
    content: str,
) -> DetectedResumeSection:
    return DetectedResumeSection(
        name=name,
        heading=name.title(),
        start_line=start_line,
        end_line=end_line,
        content=content,
    )


def test_skill_signal_extractor_detects_explicit_skill_mentions() -> None:
    extractor = SkillSignalExtractor()
    normalized_text = (
        "Summary\n"
        "Backend-focused student developer.\n"
        "Technical Skills\n"
        "Python, FastAPI, React, TypeScript, PostgreSQL, Git\n"
        "Projects\n"
        "Built a tested API with pytest."
    )
    sections = [
        build_section("summary", start_line=1, end_line=2, content="Backend-focused student."),
        build_section(
            "skills",
            start_line=3,
            end_line=4,
            content="Python, FastAPI, React, TypeScript, PostgreSQL, Git",
        ),
        build_section("projects", start_line=5, end_line=6, content="Built a tested API."),
    ]

    result = extractor.extract(normalized_text=normalized_text, sections=sections)

    assert result.status == "signals_detected"
    assert [(signal.name, signal.category) for signal in result.signals] == [
        ("Python", "programming_language"),
        ("TypeScript", "programming_language"),
        ("FastAPI", "framework"),
        ("React", "framework"),
        ("PostgreSQL", "database"),
        ("Git", "tooling"),
        ("Pytest", "testing"),
    ]
    python_signal = result.signals[0]
    assert python_signal.evidence_level == "explicit_mention"
    assert python_signal.evidence[0].source_area == "skills"
    assert python_signal.evidence[0].line_number == 4
    assert python_signal.evidence[0].matched_text == "python"


def test_skill_signal_extractor_does_not_infer_generic_skills() -> None:
    extractor = SkillSignalExtractor()

    result = extractor.extract(
        normalized_text=(
            "Summary\n"
            "Software engineering student with strong communication and leadership experience."
        ),
        sections=[],
    )

    assert result.status == "no_signals"
    assert result.signals == []


def test_skill_signal_extractor_uses_document_area_without_detected_sections() -> None:
    extractor = SkillSignalExtractor()

    result = extractor.extract(
        normalized_text="Built portfolio projects with Docker and SQL.",
        sections=[],
    )

    assert result.status == "signals_detected"
    assert [(signal.name, signal.evidence[0].source_area) for signal in result.signals] == [
        ("SQL", "document"),
        ("Docker", "document"),
    ]


def test_skill_signal_extractor_returns_not_evaluated_for_missing_text() -> None:
    extractor = SkillSignalExtractor()

    result = extractor.extract(normalized_text=None, sections=[])

    assert result.status == "not_evaluated"
    assert result.signals == []


def test_skill_signal_extractor_uses_explicit_word_boundaries() -> None:
    extractor = SkillSignalExtractor()

    result = extractor.extract(
        normalized_text="Experience\nWorked with reactive user interfaces and postgresql.",
        sections=[],
    )

    assert result.status == "signals_detected"
    assert [signal.name for signal in result.signals] == ["PostgreSQL"]
