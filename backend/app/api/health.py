"""Liveness and readiness probes."""

from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.config import get_settings
from app.db import check_database

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict:
    """Process is up — does not touch the database."""
    settings = get_settings()
    return {
        "status": "ok",
        "service": settings.app_name,
        "env": settings.app_env,
        "tz": settings.tz,
        "school_year_current": settings.school_year_current,
    }


@router.get("/ready")
def ready() -> JSONResponse:
    """Ready only when Postgres accepts a query."""
    try:
        check_database()
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"status": "ready", "database": "ok"},
        )
    except SQLAlchemyError as exc:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "not_ready", "database": "error", "detail": str(exc.__class__.__name__)},
        )
