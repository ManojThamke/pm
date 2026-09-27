"""API route controllers."""

from fastapi import APIRouter

from app.services.health import greeting, health_status

router = APIRouter(prefix="/api")


@router.get("/health")
def health() -> dict[str, str]:
    """Expose service health."""
    return health_status()


@router.get("/hello")
def hello() -> dict[str, str]:
    """Expose a minimal greeting."""
    return greeting()
