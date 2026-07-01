"""Application configuration."""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = Field(default="CareerBoost AI API", validation_alias="APP_NAME")
    app_version: str = Field(default="0.1.0", validation_alias="APP_VERSION")
    app_env: str = Field(default="development", validation_alias="APP_ENV")
    app_debug: bool = Field(default=False, validation_alias="APP_DEBUG")
    app_log_level: str = Field(default="INFO", validation_alias="APP_LOG_LEVEL")
    backend_cors_origins: str = Field(
        default="http://localhost:5173",
        validation_alias="BACKEND_CORS_ORIGINS",
    )
    upload_max_file_size_bytes: int = Field(
        default=5 * 1024 * 1024,
        validation_alias="UPLOAD_MAX_FILE_SIZE_BYTES",
    )

    @property
    def cors_origins(self) -> list[str]:
        """Return configured CORS origins."""
        return [origin.strip() for origin in self.backend_cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    """Return cached runtime settings."""
    return Settings()
