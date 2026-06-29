"""FastAPI application entrypoint."""

from fastapi import FastAPI


def create_app() -> FastAPI:
    """Create and configure the CareerBoost AI API application."""
    return FastAPI(
        title="CareerBoost AI API",
        version="0.1.0",
        description="Backend foundation for the CareerBoost AI platform.",
    )


app = create_app()
