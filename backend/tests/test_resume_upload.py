from io import BytesIO

from fastapi.testclient import TestClient
from pypdf import PdfWriter

from careerboost_api.main import create_app


def create_pdf_bytes(*, encrypted: bool = False) -> bytes:
    buffer = BytesIO()
    writer = PdfWriter()
    writer.add_blank_page(width=72, height=72)

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
    assert response.json() == {
        "status": "accepted",
        "filename": "resume.pdf",
        "content_type": "application/pdf",
        "size_bytes": len(pdf_content),
        "message": "Resume upload accepted. Analysis is not started in this contract.",
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
