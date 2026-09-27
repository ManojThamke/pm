"""Authenticated board HTTP routes."""

import base64
import os
from pathlib import Path

from fastapi import APIRouter, Depends, Header, HTTPException

from app.models.database import verify_password
from app.models.domain import Board, BoardUpdate
from app.repositories.board import BoardRepository
from app.services.board import BoardError, BoardService

router = APIRouter(prefix="/board", tags=["board"])
DB_PATH = Path(
    os.environ.get(
        "PM_DATABASE_PATH",
        str(
            Path(__file__).resolve().parents[3] / "data" / "project-management.sqlite3"
        ),
    )
)


def service() -> BoardService:
    from app.models.database import initialize_database

    initialize_database(DB_PATH)
    return BoardService(BoardRepository(DB_PATH))


def current_user(authorization: str | None = Header(default=None)) -> int:
    if not authorization or not authorization.lower().startswith("basic "):
        raise HTTPException(
            status_code=401,
            detail="authentication required",
            headers={"WWW-Authenticate": "Basic"},
        )
    try:
        username, password = base64.b64decode(authorization[6:]).decode().split(":", 1)
    except (ValueError, UnicodeDecodeError, base64.binascii.Error) as exc:
        raise HTTPException(status_code=401, detail="invalid credentials") from exc
    user = service().repository.user(username)
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="invalid credentials")
    return user.id


@router.get("", response_model=Board)
def get_board(
    user_id: int = Depends(current_user), board_service: BoardService = Depends(service)
) -> Board:
    try:
        return board_service.read(user_id)
    except BoardError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.put("", response_model=Board)
def update_board(
    payload: BoardUpdate,
    user_id: int = Depends(current_user),
    board_service: BoardService = Depends(service),
) -> Board:
    try:
        return board_service.update(user_id, payload)
    except BoardError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
