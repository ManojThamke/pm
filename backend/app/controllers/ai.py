"""Authenticated diagnostic AI routes."""

from fastapi import APIRouter, Depends, HTTPException

from app.controllers.board import current_user
from app.services.openrouter import (
    OpenRouterClient,
    OpenRouterConfigurationError,
    OpenRouterError,
    diagnostic_answer,
)

router = APIRouter(prefix="/ai", tags=["ai"])


def client() -> OpenRouterClient:
    from app.services.openrouter import OpenRouterConfig

    return OpenRouterClient(OpenRouterConfig.from_environment())


@router.get("/diagnostic")
def diagnostic(
    _user_id: int = Depends(current_user),
    openrouter: OpenRouterClient = Depends(client),
) -> dict[str, str]:
    try:
        answer = diagnostic_answer(openrouter)
    except OpenRouterConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except OpenRouterError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return {"answer": answer}
