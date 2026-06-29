from fastapi import FastAPI

from careerboost_api.main import create_app


def test_create_app_returns_fastapi_application() -> None:
    app = create_app()

    assert isinstance(app, FastAPI)
    assert app.title == "CareerBoost AI API"
