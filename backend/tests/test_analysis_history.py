import json
from io import BytesIO
from pathlib import Path
from uuid import UUID

import pytest
from fastapi.testclient import TestClient
from pypdf import PdfWriter
from pypdf.generic import DecodedStreamObject, DictionaryObject, NameObject
from pytest import MonkeyPatch

from careerboost_api.core.config import get_settings
from careerboost_api.domain import ResumeAnalysisContract
from careerboost_api.main import create_app
from careerboost_api.services.analysis_history import (
    AnalysisHistoryRepository,
    AnalysisHistoryService,
)
from careerboost_api.services.analysis_report import AnalysisReportService

RESUME_TEXT = (
    "Summary\n"
    "Student software developer.\n"
    "Skills\n"
    "Python React FastAPI TypeScript PostgreSQL\n"
    "Projects\n"
    "CareerBoost AI portfolio project.\n"
    "Education\n"
    "Computer Science coursework."
)


@pytest.fixture(autouse=True)
def isolated_history_database(monkeypatch: MonkeyPatch, tmp_path: Path) -> Path:
    database_path = tmp_path / "history.sqlite3"
    monkeypatch.setenv("ANALYSIS_HISTORY_DATABASE_PATH", str(database_path))
    get_settings.cache_clear()
    yield database_path
    get_settings.cache_clear()


def create_pdf_bytes(text: str = RESUME_TEXT) -> bytes:
    buffer = BytesIO()
    writer = PdfWriter()
    page = writer.add_blank_page(width=612, height=792)
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
    writer.write(buffer)
    return buffer.getvalue()


def upload_resume(
    client: TestClient,
    *,
    filename: str = "resume.pdf",
    resume_text: str = RESUME_TEXT,
    target_criteria: dict[str, object] | None = None,
) -> dict[str, object]:
    data = {}
    if target_criteria is not None:
        data["target_criteria"] = json.dumps(target_criteria)

    response = client.post(
        "/resumes/upload",
        files={"file": (filename, create_pdf_bytes(resume_text), "application/pdf")},
        data=data,
    )

    assert response.status_code == 202
    return response.json()


def test_history_repository_initializes_storage(isolated_history_database: Path) -> None:
    repository = AnalysisHistoryRepository(isolated_history_database)

    repository.initialize()

    assert isolated_history_database.exists()


def test_successful_upload_creates_history_record() -> None:
    client = TestClient(create_app())

    upload_response = upload_resume(client)
    analysis_id = upload_response["analysis_id"]

    UUID(str(analysis_id))
    history_response = client.get("/analyses")

    assert history_response.status_code == 200
    assert history_response.json()[0]["analysis_id"] == analysis_id
    assert history_response.json()[0]["filename"] == "resume.pdf"


def test_upload_validation_failure_does_not_create_history_record() -> None:
    client = TestClient(create_app())

    response = client.post(
        "/resumes/upload",
        files={"file": ("resume.txt", b"not a pdf", "text/plain")},
    )

    assert response.status_code == 422
    assert client.get("/analyses").json() == []


def test_list_analyses_returns_summaries_only_with_newest_first_and_pagination() -> None:
    client = TestClient(create_app())

    first = upload_resume(client, filename="first.pdf")
    second = upload_resume(client, filename="second.pdf")
    third = upload_resume(client, filename="third.pdf")

    response = client.get("/analyses", params={"limit": 2, "offset": 0})

    assert response.status_code == 200
    summaries = response.json()
    assert [summary["analysis_id"] for summary in summaries] == [
        third["analysis_id"],
        second["analysis_id"],
    ]
    assert "extraction" not in summaries[0]
    assert "target_alignment" not in summaries[0]

    next_page = client.get("/analyses", params={"limit": 2, "offset": 2})

    assert next_page.status_code == 200
    assert [summary["analysis_id"] for summary in next_page.json()] == [first["analysis_id"]]


def test_get_analysis_by_id_returns_full_canonical_response() -> None:
    client = TestClient(create_app())
    upload_response = upload_resume(client)

    response = client.get(f"/analyses/{upload_response['analysis_id']}")

    assert response.status_code == 200
    stored_response = response.json()
    assert stored_response["analysis_id"] == upload_response["analysis_id"]
    assert (
        stored_response["extraction"]["extracted_text"]
        == upload_response["extraction"]["extracted_text"]
    )
    ResumeAnalysisContract.model_validate(stored_response)


def test_get_unknown_analysis_id_returns_404() -> None:
    client = TestClient(create_app())

    response = client.get("/analyses/unknown-analysis-id")

    assert response.status_code == 404
    assert response.json()["detail"] == "Analysis record was not found."


def test_download_analysis_report_returns_standalone_html() -> None:
    client = TestClient(create_app())
    upload_response = upload_resume(
        client,
        target_criteria={
            "target_role": "Frontend Developer Intern",
            "required_skills": ["React", "Rust"],
            "preferred_skills": ["Docker"],
            "required_sections": ["summary", "skills", "certifications"],
            "analysis_priorities": ["resume_structure", "skill_visibility"],
        },
    )

    response = client.get(f"/analyses/{upload_response['analysis_id']}/report.html")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/html")
    assert (
        response.headers["content-disposition"]
        == f'attachment; filename="careerboost-analysis-{upload_response["analysis_id"]}.html"'
    )
    assert "CareerBoost AI Resume Analysis Report" in response.text
    assert "Report metadata" in response.text
    assert "Application Target" in response.text
    assert "Target Alignment" in response.text
    assert "Improvement Guidance" in response.text
    assert "Resume Structure" in response.text
    assert "ATS Metadata" in response.text
    assert "Skill Signals" in response.text
    assert "Role Matching Metadata" in response.text
    assert "Extracted Text Preview" in response.text
    assert "Limitations" in response.text
    assert "Frontend Developer Intern" in response.text
    assert "not_scored" in response.text
    assert "does not guarantee hiring outcomes" in response.text


def test_download_analysis_report_works_without_target_criteria() -> None:
    client = TestClient(create_app())
    upload_response = upload_resume(client)

    response = client.get(f"/analyses/{upload_response['analysis_id']}/report.html")

    assert response.status_code == 200
    assert "not_provided" in response.text
    assert "No target criteria were provided" not in response.text
    assert "Report metadata" in response.text


def test_download_analysis_report_includes_extraction_quality_warnings() -> None:
    client = TestClient(create_app())
    upload_response = upload_resume(
        client,
        resume_text=(
            "Sertifikasi\n"
            "Network fundamentals\n"
            "Profil\n"
            "Student developer\n"
            "Alex Morgan\n"
            "Kemampuan Utama\n"
            "Python SQL"
        ),
    )

    response = client.get(f"/analyses/{upload_response['analysis_id']}/report.html")

    assert response.status_code == 200
    assert "Extraction quality advisories" in response.text
    assert "unusual_section_order" in response.text
    assert "unusual order" in response.text


def test_download_unknown_analysis_report_returns_404() -> None:
    client = TestClient(create_app())

    response = client.get("/analyses/unknown-analysis-id/report.html")

    assert response.status_code == 404
    assert response.json()["detail"] == "Analysis record was not found."


def test_report_service_escapes_unsafe_resume_content() -> None:
    client = TestClient(create_app())
    upload_response = upload_resume(client)
    analysis = ResumeAnalysisContract.model_validate(upload_response)
    unsafe_analysis = analysis.model_copy(
        deep=True,
        update={
            "intake": analysis.intake.model_copy(
                update={"filename": '<script>alert("x")</script>.pdf'}
            ),
            "extraction": analysis.extraction.model_copy(
                update={
                    "extracted_text": '<img src=x onerror="alert(1)">',
                    "normalized_text": '<img src=x onerror="alert(1)">',
                }
            ),
        },
    )

    report_html = AnalysisReportService().generate_html_report(unsafe_analysis)

    assert "<script>" not in report_html
    assert "<img src=x" not in report_html
    assert "&lt;script&gt;" in report_html
    assert "&lt;img src=x" in report_html


def test_report_service_escapes_unsafe_recommendation_content() -> None:
    client = TestClient(create_app())
    upload_response = upload_resume(client)
    analysis = ResumeAnalysisContract.model_validate(upload_response)
    assert analysis.recommendations.status == "recommendations_ready"
    unsafe_recommendations = analysis.recommendations.model_copy(
        deep=True,
        update={
            "items": [
                analysis.recommendations.items[0].model_copy(
                    update={
                        "title": 'Review <script>alert("x")</script>',
                        "actionable_next_step": '<img src=x onerror="alert(1)">',
                    }
                )
            ]
        },
    )
    unsafe_analysis = analysis.model_copy(update={"recommendations": unsafe_recommendations})

    report_html = AnalysisReportService().generate_html_report(unsafe_analysis)

    assert "<script>" not in report_html
    assert "<img src=x" not in report_html
    assert "&lt;script&gt;" in report_html
    assert "&lt;img src=x" in report_html


def test_report_omits_private_runtime_artifacts(isolated_history_database: Path) -> None:
    client = TestClient(create_app())
    upload_response = upload_resume(client)

    response = client.get(f"/analyses/{upload_response['analysis_id']}/report.html")

    assert "%PDF" not in response.text
    assert "Traceback" not in response.text
    assert str(Path.cwd()) not in response.text
    assert str(isolated_history_database) not in response.text


def test_delete_analysis_removes_record() -> None:
    client = TestClient(create_app())
    upload_response = upload_resume(client)
    analysis_id = upload_response["analysis_id"]

    delete_response = client.delete(f"/analyses/{analysis_id}")

    assert delete_response.status_code == 200
    assert delete_response.json() == {"detail": "Analysis record deleted."}
    assert client.get(f"/analyses/{analysis_id}").status_code == 404


def test_delete_unknown_analysis_id_returns_404() -> None:
    client = TestClient(create_app())

    response = client.delete("/analyses/unknown-analysis-id")

    assert response.status_code == 404
    assert response.json()["detail"] == "Analysis record was not found."


def test_stored_response_includes_target_criteria_and_alignment() -> None:
    client = TestClient(create_app())
    upload_response = upload_resume(
        client,
        target_criteria={
            "target_role": "Frontend Developer Intern",
            "required_skills": ["React", "Rust"],
            "required_sections": ["summary", "skills", "certifications"],
            "analysis_priorities": ["resume_structure", "skill_visibility"],
        },
    )

    stored_response = client.get(f"/analyses/{upload_response['analysis_id']}").json()

    assert stored_response["target_criteria"]["status"] == "provided"
    assert stored_response["target_criteria"]["target_role"] == "Frontend Developer Intern"
    assert stored_response["target_alignment"]["status"] == "evaluated"
    assert [item["status"] for item in stored_response["target_alignment"]["required_skills"]] == [
        "found",
        "not_found",
    ]
    assert stored_response["recommendations"]["status"] == "recommendations_ready"
    assert stored_response["recommendations"]["items"]


def test_stored_response_works_without_target_criteria() -> None:
    client = TestClient(create_app())
    upload_response = upload_resume(client)

    stored_response = client.get(f"/analyses/{upload_response['analysis_id']}").json()

    assert stored_response["target_criteria"]["status"] == "not_provided"
    assert stored_response["target_alignment"]["status"] == "not_provided"
    assert stored_response["recommendations"]["status"] == "recommendations_ready"


def test_old_stored_response_without_recommendations_remains_compatible() -> None:
    client = TestClient(create_app())
    upload_response = upload_resume(client)
    payload_without_recommendations = dict(upload_response)
    payload_without_recommendations.pop("recommendations")

    analysis = ResumeAnalysisContract.model_validate(payload_without_recommendations)

    assert analysis.recommendations.status == "not_started"


def test_repository_stores_no_pdf_binary_or_absolute_paths(isolated_history_database: Path) -> None:
    client = TestClient(create_app())

    upload_resume(client)
    database_bytes = isolated_history_database.read_bytes()

    assert b"%PDF" not in database_bytes
    assert str(Path.cwd()).encode() not in database_bytes


def test_history_service_assigns_public_uuid_before_storage(tmp_path: Path) -> None:
    client = TestClient(create_app())
    upload_response = upload_resume(client)
    stored_analysis = ResumeAnalysisContract.model_validate(upload_response)

    repository = AnalysisHistoryRepository(tmp_path / "manual-history.sqlite3")
    service = AnalysisHistoryService(repository)
    copied_analysis = stored_analysis.model_copy(update={"analysis_id": None})

    persisted = service.store_completed_analysis(copied_analysis)

    UUID(str(persisted.analysis_id))
    assert persisted.analysis_id != stored_analysis.analysis_id
