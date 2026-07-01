from io import BytesIO

from fastapi.testclient import TestClient
from pypdf import PdfWriter
from pypdf.generic import DecodedStreamObject, DictionaryObject, NameObject
from pytest import MonkeyPatch

from careerboost_api.main import create_app
from careerboost_api.services.resume_extraction import (
    ResumeTextExtractionError,
    ResumeTextExtractor,
)

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
            "error": None,
        },
        "ats": {
            "status": "not_started",
            "name": "ats",
            "label": "ATS analysis",
        },
        "skills": {
            "status": "not_started",
            "name": "skills",
            "label": "Skill extraction",
        },
        "roles": {
            "status": "not_started",
            "name": "roles",
            "label": "Role matching",
        },
        "recommendations": {
            "status": "not_started",
            "name": "recommendations",
            "label": "Learning recommendations",
        },
    }


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
        "error": {
            "category": "low_text",
            "message": "Resume text is too short to analyze. Upload a text-based PDF resume.",
        },
    }
    assert response_body["ats"]["status"] == "not_started"


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
