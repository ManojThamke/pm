"""Authenticated diagnostic AI routes."""

from fastapi import APIRouter, Depends, HTTPException

from app.controllers.board import current_user
from app.controllers.board import service as board_service_factory
from app.models.domain import BoardOperationRequest, BoardOperationResponse
from app.services.board import BoardError
from app.services.openrouter import (
    OpenRouterClient,
    OpenRouterConfigurationError,
    OpenRouterError,
    build_board_operation_prompt,
    diagnostic_answer,
    parse_board_operation_response,
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


@router.post("/board-operation", response_model=BoardOperationResponse)
def board_operation(
    payload: BoardOperationRequest,
    user_id: int = Depends(current_user),
    openrouter: OpenRouterClient = Depends(client),
    board_service=Depends(board_service_factory),
) -> BoardOperationResponse:
    try:
        current = board_service.read(user_id)
        if payload.board != current:
            raise HTTPException(status_code=409, detail="board snapshot is out of date")
        prompt = build_board_operation_prompt(
            payload.board, payload.question, payload.history
        )
        result = parse_board_operation_response(openrouter.ask(prompt))
        if result.board_update is not None:
            board_service.update(user_id, result.board_update)
        return result
    except HTTPException:
        raise
    except OpenRouterConfigurationError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except BoardError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except OpenRouterError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
