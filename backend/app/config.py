"""Application settings loaded from environment / .env."""

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_ROOT = Path(__file__).resolve().parent.parent
_ENV_FILE = _BACKEND_ROOT / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: str = Field(default="development", alias="APP_ENV")
    app_name: str = Field(default="STEM Society Calendar API", alias="APP_NAME")
    api_host: str = Field(default="127.0.0.1", alias="API_HOST")
    api_port: int = Field(default=8000, alias="API_PORT")

    database_url: str = Field(..., alias="DATABASE_URL")
    session_secret: str = Field(..., alias="SESSION_SECRET", min_length=32)

    cors_origins_raw: str = Field(
        default="http://localhost:4173,http://127.0.0.1:4173",
        alias="CORS_ORIGINS",
    )
    cookie_secure: bool = Field(default=False, alias="COOKIE_SECURE")
    cookie_samesite: str = Field(default="lax", alias="COOKIE_SAMESITE")

    school_year_current: str = Field(default="2025-2026", alias="SCHOOL_YEAR_CURRENT")
    tz: str = Field(default="Asia/Karachi", alias="TZ")

    @property
    def cors_origins(self) -> list[str]:
        return [part.strip() for part in self.cors_origins_raw.split(",") if part.strip()]

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
