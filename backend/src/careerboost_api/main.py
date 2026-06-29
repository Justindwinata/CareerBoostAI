"""FastAPI application entrypoint."""

from fastapi import FastAPI

from careerboost_api.api.health import router as health_router
from careerboost_api.core.config import get_settings
from careerboost_api.core.logging import configure_logging


def create_app() -> FastAPI:
    """Create and configure the CareerBoost AI API application."""
    settings = get_settings()
    configure_logging(settings)

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="Backend foundation for the CareerBoost AI platform.",
        debug=settings.app_debug,
    )

    app.include_router(health_router)

    return app


app = create_app()
