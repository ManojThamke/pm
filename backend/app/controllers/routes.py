"""API route controllers."""

from fastapi import APIRouter

from app.controllers.ai import router as ai_router
from app.controllers.board import router as board_router
from app.services.health import greeting, health_status

router = APIRouter(prefix="/api")
router.include_router(board_router)
router.include_router(ai_router)


@router.get("/health")
def health() -> dict[str, str]:
    """Expose service health."""
    return health_status()


@router.get("/hello")
def hello() -> dict[str, str]:
    """Expose a minimal greeting."""
    return greeting()
