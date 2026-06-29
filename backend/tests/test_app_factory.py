from fastapi import FastAPI
from fastapi.testclient import TestClient

from careerboost_api.main import create_app


def test_create_app_returns_fastapi_application() -> None:
    app = create_app()

    assert isinstance(app, FastAPI)
    assert app.title == "CareerBoost AI API"


def test_health_endpoint_returns_service_status() -> None:
    client = TestClient(create_app())

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "CareerBoost AI API",
        "version": "0.1.0",
        "environment": "development",
    }
