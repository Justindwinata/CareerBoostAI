from careerboost_api.domain import DetectedResumeSection, ResumeSectionName
from careerboost_api.services.resume_completeness import ResumeCompletenessCalculator


def build_section(name: ResumeSectionName) -> DetectedResumeSection:
    return DetectedResumeSection(
        name=name,
        heading=name.title(),
        start_line=1,
        end_line=2,
        content="Section content",
    )


def test_completeness_calculator_reports_all_sections_present() -> None:
    calculator = ResumeCompletenessCalculator()

    result = calculator.calculate(
        [
            build_section("summary"),
            build_section("skills"),
            build_section("experience"),
            build_section("education"),
            build_section("projects"),
        ]
    )

    assert result.expected_sections == ["summary", "skills", "experience", "education", "projects"]
    assert result.present_sections == ["summary", "skills", "experience", "education", "projects"]
    assert result.missing_sections == []
    assert result.score == 1


def test_completeness_calculator_reports_present_and_missing_sections() -> None:
    calculator = ResumeCompletenessCalculator()

    result = calculator.calculate(
        [
            build_section("summary"),
            build_section("skills"),
            build_section("projects"),
        ]
    )

    assert result.present_sections == ["summary", "skills", "projects"]
    assert result.missing_sections == ["experience", "education"]
    assert result.score == 0.6


def test_completeness_calculator_handles_no_detected_sections() -> None:
    calculator = ResumeCompletenessCalculator()

    result = calculator.calculate([])

    assert result.present_sections == []
    assert result.missing_sections == ["summary", "skills", "experience", "education", "projects"]
    assert result.score == 0


def test_completeness_calculator_deduplicates_detected_sections() -> None:
    calculator = ResumeCompletenessCalculator()

    result = calculator.calculate(
        [
            build_section("skills"),
            build_section("skills"),
            build_section("education"),
        ]
    )

    assert result.present_sections == ["skills", "education"]
    assert result.missing_sections == ["summary", "experience", "projects"]
    assert result.score == 0.4
