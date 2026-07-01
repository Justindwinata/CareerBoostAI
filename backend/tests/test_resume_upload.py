from io import BytesIO

from fastapi.testclient import TestClient
from pypdf import PdfWriter
from pypdf.generic import DecodedStreamObject, DictionaryObject, NameObject
from pytest import MonkeyPatch

from careerboost_api.domain import (
    ResumeAnalysisContract,
    ResumeCompletenessContract,
    ResumeExtractionContract,
    ResumeIntakeContract,
)
from careerboost_api.main import create_app
from careerboost_api.services.resume_extraction import (
    ResumeTextExtractionError,
    ResumeTextExtractionResult,
    ResumeTextExtractor,
)
from careerboost_api.services.resume_intake import ResumeIntakeOrchestrator
from careerboost_api.services.resume_upload import ValidatedResumeUpload

RESUME_TEXT = (
    "Justin Dwinata Software Engineer Internship Resume Python React FastAPI TypeScript "
    "PostgreSQL Projects Education Experience Skills Portfolio Backend Frontend Testing"
)


def create_pdf_bytes(*, encrypted: bool = False, text: str | None = RESUME_TEXT) -> bytes:
    buffer = BytesIO()
    writer = PdfWriter()
    page = writer.add_blank_page(width=612, height=792)

    if text is not None:
        stream = DecodedStreamObject()
        stream.set_data(f"BT /F1 12 Tf 72 720 Td ({text}) Tj ET".encode())
        page[NameObject("/Contents")] = stream
        page[NameObject("/Resources")] = DictionaryObject(
            {
                NameObject("/Font"): DictionaryObject(
                    {
                        NameObject("/F1"): DictionaryObject(
                            {
                                NameObject("/Type"): NameObject("/Font"),
                                NameObject("/Subtype"): NameObject("/Type1"),
                                NameObject("/BaseFont"): NameObject("/Helvetica"),
                            }
                        )
                    }
                )
            }
        )

    if encrypted:
        writer.encrypt("secret")

    writer.write(buffer)
    return buffer.getvalue()


def test_upload_resume_accepts_valid_pdf() -> None:
    client = TestClient(create_app())
    pdf_content = create_pdf_bytes()

    response = client.post(
        "/resumes/upload",
        files={"file": ("resume.pdf", pdf_content, "application/pdf")},
    )

    assert response.status_code == 202
    response_body = response.json()

    assert response_body == {
        "status": "intake_completed",
        "intake": {
            "status": "accepted",
            "filename": "resume.pdf",
            "content_type": "application/pdf",
            "size_bytes": len(pdf_content),
        },
        "extraction": {
            "status": "extracted",
            "confidence": "medium",
            "character_count": len(RESUME_TEXT),
            "page_count": 1,
            "extracted_text": RESUME_TEXT,
            "normalized_text": RESUME_TEXT,
            "sections": [],
            "error": None,
        },
        "completeness": {
            "expected_sections": ["summary", "skills", "experience", "education", "projects"],
            "present_sections": [],
            "missing_sections": ["summary", "skills", "experience", "education", "projects"],
            "score": 0,
        },
        "ats": {
            "status": "metadata_ready",
            "source": "deterministic_resume_signals",
            "issues": [
                {
                    "category": "section_presence",
                    "severity": "warning",
                    "title": "Expected section not detected",
                    "description": (
                        "The Summary section was not detected by deterministic resume headings."
                    ),
                    "observed_signal": "missing_section:summary",
                    "related_sections": ["summary"],
                },
                {
                    "category": "section_presence",
                    "severity": "warning",
                    "title": "Expected section not detected",
                    "description": (
                        "The Skills section was not detected by deterministic resume headings."
                    ),
                    "observed_signal": "missing_section:skills",
                    "related_sections": ["skills"],
                },
                {
                    "category": "section_presence",
                    "severity": "warning",
                    "title": "Expected section not detected",
                    "description": (
                        "The Experience section was not detected by deterministic resume headings."
                    ),
                    "observed_signal": "missing_section:experience",
                    "related_sections": ["experience"],
                },
                {
                    "category": "section_presence",
                    "severity": "warning",
                    "title": "Expected section not detected",
                    "description": (
                        "The Education section was not detected by deterministic resume headings."
                    ),
                    "observed_signal": "missing_section:education",
                    "related_sections": ["education"],
                },
                {
                    "category": "section_presence",
                    "severity": "warning",
                    "title": "Expected section not detected",
                    "description": (
                        "The Projects section was not detected by deterministic resume headings."
                    ),
                    "observed_signal": "missing_section:projects",
                    "related_sections": ["projects"],
                },
                {
                    "category": "section_structure",
                    "severity": "warning",
                    "title": "No resume headings detected",
                    "description": (
                        "No expected resume section headings were detected in the extracted text."
                    ),
                    "observed_signal": "section_count:0",
                    "related_sections": [],
                },
                {
                    "category": "formatting_risk",
                    "severity": "warning",
                    "title": "Low extracted text volume",
                    "description": (
                        "The extracted text length is below the deterministic metadata review "
                        "threshold."
                    ),
                    "observed_signal": "character_count:<600",
                    "related_sections": [],
                },
                {
                    "category": "readability_structure",
                    "severity": "info",
                    "title": "Medium extraction confidence",
                    "description": (
                        "Text was extracted, but the extraction confidence was lower than the "
                        "highest available deterministic confidence level."
                    ),
                    "observed_signal": "extraction_confidence:medium",
                    "related_sections": [],
                },
                {
                    "category": "keyword_coverage_placeholder",
                    "severity": "info",
                    "title": "Keyword coverage not evaluated",
                    "description": (
                        "Keyword coverage requires a future role-specific keyword source."
                    ),
                    "observed_signal": "keyword_coverage:not_evaluated",
                    "related_sections": [],
                },
            ],
            "keyword_coverage": {
                "status": "not_evaluated",
                "matched_keywords": [],
                "missing_keywords": [],
            },
            "score": {
                "status": "not_scored",
                "score": None,
            },
        },
        "skills": {
            "status": "signals_detected",
            "source": "deterministic_normalized_text",
            "signals": [
                {
                    "name": "Python",
                    "category": "programming_language",
                    "evidence_level": "explicit_mention",
                    "evidence": [
                        {
                            "matched_text": "python",
                            "source_area": "document",
                            "line_number": 1,
                            "evidence_text": RESUME_TEXT,
                        }
                    ],
                },
                {
                    "name": "TypeScript",
                    "category": "programming_language",
                    "evidence_level": "explicit_mention",
                    "evidence": [
                        {
                            "matched_text": "typescript",
                            "source_area": "document",
                            "line_number": 1,
                            "evidence_text": RESUME_TEXT,
                        }
                    ],
                },
                {
                    "name": "FastAPI",
                    "category": "framework",
                    "evidence_level": "explicit_mention",
                    "evidence": [
                        {
                            "matched_text": "fastapi",
                            "source_area": "document",
                            "line_number": 1,
                            "evidence_text": RESUME_TEXT,
                        }
                    ],
                },
                {
                    "name": "React",
                    "category": "framework",
                    "evidence_level": "explicit_mention",
                    "evidence": [
                        {
                            "matched_text": "react",
                            "source_area": "document",
                            "line_number": 1,
                            "evidence_text": RESUME_TEXT,
                        }
                    ],
                },
                {
                    "name": "PostgreSQL",
                    "category": "database",
                    "evidence_level": "explicit_mention",
                    "evidence": [
                        {
                            "matched_text": "postgresql",
                            "source_area": "document",
                            "line_number": 1,
                            "evidence_text": RESUME_TEXT,
                        }
                    ],
                },
            ],
        },
        "roles": {
            "status": "metadata_ready",
            "source": "deterministic_resume_metadata",
            "candidates": [
                {
                    "role_name": "Backend Developer Intern",
                    "match_status": "partial_match",
                    "confidence_state": "metadata_ready",
                    "deterministic_evidence": [
                        "Explicit required skill signal detected: Python",
                        "Explicit required skill signal detected: FastAPI",
                    ],
                    "matched_skill_signals": ["Python", "FastAPI"],
                    "missing_required_signals": ["SQL"],
                    "supporting_sections": [],
                },
                {
                    "role_name": "Frontend Developer Intern",
                    "match_status": "partial_match",
                    "confidence_state": "metadata_ready",
                    "deterministic_evidence": [
                        "Explicit required skill signal detected: React",
                        "Explicit required skill signal detected: TypeScript",
                    ],
                    "matched_skill_signals": ["React", "TypeScript"],
                    "missing_required_signals": ["CSS"],
                    "supporting_sections": [],
                },
                {
                    "role_name": "Full Stack Developer Intern",
                    "match_status": "partial_match",
                    "confidence_state": "metadata_ready",
                    "deterministic_evidence": [
                        "Explicit required skill signal detected: React",
                        "Explicit required skill signal detected: TypeScript",
                        "Explicit required skill signal detected: FastAPI",
                    ],
                    "matched_skill_signals": ["React", "TypeScript", "FastAPI"],
                    "missing_required_signals": ["SQL"],
                    "supporting_sections": [],
                },
                {
                    "role_name": "Data Analyst Intern",
                    "match_status": "partial_match",
                    "confidence_state": "metadata_ready",
                    "deterministic_evidence": [
                        "Explicit required skill signal detected: Python",
                    ],
                    "matched_skill_signals": ["Python"],
                    "missing_required_signals": ["SQL"],
                    "supporting_sections": [],
                },
                {
                    "role_name": "Machine Learning Intern",
                    "match_status": "partial_match",
                    "confidence_state": "metadata_ready",
                    "deterministic_evidence": [
                        "Explicit required skill signal detected: Python",
                    ],
                    "matched_skill_signals": ["Python"],
                    "missing_required_signals": ["SQL"],
                    "supporting_sections": [],
                },
            ],
        },
        "recommendations": {
            "status": "not_started",
            "name": "recommendations",
            "label": "Learning recommendations",
        },
    }


def test_upload_resume_delegates_success_mapping_to_orchestrator(
    monkeypatch: MonkeyPatch,
) -> None:
    client = TestClient(create_app())
    pdf_content = create_pdf_bytes()
    delegation_calls = 0

    def build_success(
        self: ResumeIntakeOrchestrator,
        *,
        upload: ValidatedResumeUpload,
        extraction: ResumeTextExtractionResult,
    ) -> ResumeAnalysisContract:
        nonlocal delegation_calls
        delegation_calls += 1
        assert upload.filename == "resume.pdf"
        assert extraction.extracted_text == RESUME_TEXT
        return ResumeAnalysisContract(
            status="intake_completed",
            intake=ResumeIntakeContract(
                status="accepted",
                filename=upload.filename,
                content_type=upload.content_type,
                size_bytes=upload.size_bytes,
            ),
            extraction=ResumeExtractionContract(
                status="extracted",
                confidence=extraction.confidence,
                character_count=extraction.character_count,
                page_count=extraction.page_count,
                extracted_text=extraction.extracted_text,
                normalized_text=extraction.extracted_text,
            ),
            completeness=ResumeCompletenessContract(
                expected_sections=["summary", "skills", "experience", "education", "projects"],
                present_sections=[],
                missing_sections=["summary", "skills", "experience", "education", "projects"],
                score=0,
            ),
        )

    monkeypatch.setattr(ResumeIntakeOrchestrator, "build_success", build_success)

    response = client.post(
        "/resumes/upload",
        files={"file": ("resume.pdf", pdf_content, "application/pdf")},
    )

    assert response.status_code == 202
    assert delegation_calls == 1
    assert response.json()["status"] == "intake_completed"
    assert response.json()["completeness"] is not None


def test_upload_resume_rejects_non_pdf_content_type() -> None:
    client = TestClient(create_app())

    response = client.post(
        "/resumes/upload",
        files={"file": ("resume.txt", b"not a pdf", "text/plain")},
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "Resume must use a .pdf file extension."


def test_upload_resume_rejects_invalid_pdf_content() -> None:
    client = TestClient(create_app())

    response = client.post(
        "/resumes/upload",
        files={"file": ("resume.pdf", b"not a pdf", "application/pdf")},
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "Resume file is not a valid PDF."


def test_upload_resume_rejects_low_text_pdf() -> None:
    client = TestClient(create_app())
    blank_pdf = create_pdf_bytes(text=None)

    response = client.post(
        "/resumes/upload",
        files={"file": ("resume.pdf", blank_pdf, "application/pdf")},
    )

    assert response.status_code == 422
    response_body = response.json()

    assert response_body["status"] == "failed"
    assert response_body["intake"]["status"] == "accepted"
    assert response_body["extraction"] == {
        "status": "failed",
        "confidence": None,
        "character_count": 0,
        "page_count": 0,
        "extracted_text": None,
        "normalized_text": None,
        "sections": [],
        "error": {
            "category": "low_text",
            "message": "Resume text is too short to analyze. Upload a text-based PDF resume.",
        },
    }
    assert response_body["completeness"] is None
    assert response_body["ats"]["status"] == "not_evaluated"
    assert response_body["ats"]["score"] == {"status": "not_scored", "score": None}
    assert response_body["skills"]["status"] == "not_evaluated"
    assert response_body["roles"]["status"] == "not_evaluated"


def test_upload_resume_returns_structured_unreadable_extraction_failure(
    monkeypatch: MonkeyPatch,
) -> None:
    client = TestClient(create_app())
    pdf_content = create_pdf_bytes()

    def fail_extraction(self: ResumeTextExtractor, content: bytes) -> None:
        raise ResumeTextExtractionError("Resume text could not be extracted from this PDF.")

    monkeypatch.setattr(ResumeTextExtractor, "extract", fail_extraction)

    response = client.post(
        "/resumes/upload",
        files={"file": ("resume.pdf", pdf_content, "application/pdf")},
    )

    assert response.status_code == 422
    response_body = response.json()

    assert response_body["status"] == "failed"
    assert response_body["intake"]["filename"] == "resume.pdf"
    assert response_body["extraction"]["error"] == {
        "category": "unreadable_pdf",
        "message": "Resume text could not be extracted from this PDF.",
    }
    assert response_body["completeness"] is None


def test_upload_resume_rejects_oversized_pdf() -> None:
    client = TestClient(create_app())
    oversized_content = b"%PDF-1.7\n" + (b"0" * (5 * 1024 * 1024 + 1))

    response = client.post(
        "/resumes/upload",
        files={"file": ("resume.pdf", oversized_content, "application/pdf")},
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "Resume file must be 5 MB or smaller."


def test_upload_resume_rejects_password_protected_pdf() -> None:
    client = TestClient(create_app())
    encrypted_pdf = create_pdf_bytes(encrypted=True)

    response = client.post(
        "/resumes/upload",
        files={"file": ("resume.pdf", encrypted_pdf, "application/pdf")},
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "Password-protected PDFs are not supported."
