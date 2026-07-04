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


def test_text_processor_detects_indonesian_resume_section_aliases() -> None:
    processor = ResumeTextProcessor()
    normalized_text = (
        "Profil\n"
        "Mahasiswa teknik informatika.\n"
        "Kemampuan Utama\n"
        "Python, SQL, React\n"
        "Pengalaman Kerja\n"
        "IT support intern\n"
        "Pendidikan\n"
        "S1 Teknik Informatika\n"
        "Sertifikasi\n"
        "Database fundamentals"
    )

    sections = processor.detect_sections(normalized_text)

    assert [section.name for section in sections] == [
        "summary",
        "skills",
        "experience",
        "education",
        "certifications",
    ]
    assert sections[0].heading == "Profil"
    assert sections[-1].heading == "Sertifikasi"


def test_text_processor_detects_mixed_indonesian_english_project_aliases() -> None:
    processor = ResumeTextProcessor()
    normalized_text = (
        "Tentang Saya\n"
        "Frontend developer student.\n"
        "Skill\n"
        "HTML, CSS, JavaScript\n"
        "Project\n"
        "Portfolio website\n"
        "Portofolio\n"
        "CareerBoost AI\n"
        "Organisasi\n"
        "Student technology club\n"
        "Penghargaan\n"
        "Hackathon finalist"
    )

    sections = processor.detect_sections(normalized_text)

    assert [section.name for section in sections] == [
        "summary",
        "skills",
        "projects",
        "projects",
        "organizations",
        "awards",
    ]


def test_text_processor_warns_without_blocking_suspicious_extraction_order() -> None:
    processor = ResumeTextProcessor()
    normalized_text = (
        "Sertifikasi\n"
        "Network fundamentals\n"
        "Profil\n"
        "Student developer\n"
        "Alex Morgan\n"
        "Kemampuan Utama\n"
        "Python SQL"
    )

    result = processor.process(normalized_text)

    assert [section.name for section in result.sections] == [
        "certifications",
        "summary",
        "skills",
    ]
    assert [warning.category for warning in result.quality_warnings] == [
        "unusual_section_order",
        "short_section_content",
    ]
    assert "unusual order" in result.quality_warnings[0].message
