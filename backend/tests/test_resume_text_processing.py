from careerboost_api.services.resume_text_processing import ResumeTextProcessor


def test_text_processor_normalizes_whitespace_without_losing_content() -> None:
    processor = ResumeTextProcessor()
    extracted_text = (
        "  Summary  \r\n"
        "\tBackend developer student.  \n"
        "\n"
        "\n"
        "Technical   Skills:\n"
        "Python\tFastAPI   React  "
    )

    result = processor.process(extracted_text)

    assert result.normalized_text == (
        "Summary\nBackend developer student.\n\nTechnical Skills:\nPython FastAPI React"
    )


def test_text_processor_detects_common_resume_sections() -> None:
    processor = ResumeTextProcessor()
    normalized_text = (
        "Professional Summary\n"
        "Backend-focused student developer.\n"
        "Skills:\n"
        "Python, FastAPI, React\n"
        "Work Experience\n"
        "Software engineering intern\n"
        "Education\n"
        "B.S. Informatics\n"
        "Projects\n"
        "CareerBoost AI"
    )

    sections = processor.detect_sections(normalized_text)

    assert [section.name for section in sections] == [
        "summary",
        "skills",
        "experience",
        "education",
        "projects",
    ]
    assert sections[0].heading == "Professional Summary"
    assert sections[0].start_line == 1
    assert sections[0].end_line == 2
    assert sections[0].content == "Backend-focused student developer."
    assert sections[-1].content == "CareerBoost AI"


def test_text_processor_ignores_non_heading_sentences() -> None:
    processor = ResumeTextProcessor()
    normalized_text = "Built projects with Python and documented education history."

    assert processor.detect_sections(normalized_text) == []
