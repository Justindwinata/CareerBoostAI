"""Structured logging configuration."""

import logging
from logging.config import dictConfig

from careerboost_api.core.config import Settings


def configure_logging(settings: Settings) -> None:
    """Configure application logging with a consistent structured format."""
    dictConfig(
        {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "default": {
                    "format": (
                        '{"level":"%(levelname)s","logger":"%(name)s","message":"%(message)s"}'
                    )
                }
            },
            "handlers": {
                "default": {
                    "class": "logging.StreamHandler",
                    "formatter": "default",
                }
            },
            "root": {
                "handlers": ["default"],
                "level": settings.app_log_level,
            },
        }
    )

    logging.getLogger(__name__).info("logging_configured")
