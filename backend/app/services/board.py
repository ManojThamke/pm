"""Board application service and invariants."""

from app.models.database import verify_password
from app.models.domain import Board
from app.repositories.board import BoardRepository


class BoardError(Exception):
    status_code = 400


class AuthenticationError(BoardError):
    status_code = 401


class BoardService:
    def __init__(self, repository: BoardRepository):
        self.repository = repository

    def authenticate(self, username: str, password: str) -> int:
        user = self.repository.user(username)
        if not user or not verify_password(password, user.password_hash):
            raise AuthenticationError("invalid credentials")
        return user.id

    def read(self, user_id: int) -> Board:
        board = self.repository.load(user_id)
        if board is None:
            raise BoardError("board not found")
        return board

    def update(self, user_id: int, board: Board) -> Board:
        existing = self.read(user_id)
        if {column.id for column in existing.columns} != {
            column.id for column in board.columns
        }:
            raise BoardError("column IDs cannot be added or removed")
        if set(existing.cards) != set(board.cards):
            raise BoardError("card IDs cannot be added or removed")
        card_ids = [card_id for column in board.columns for card_id in column.cardIds]
        if len(card_ids) != len(set(card_ids)) or set(card_ids) != set(board.cards):
            raise BoardError("cards must be referenced exactly once")
        if len({column.id for column in board.columns}) != len(board.columns):
            raise BoardError("column IDs must be unique")
        try:
            self.repository.save(user_id, board)
        except (ValueError, LookupError, KeyError) as exc:
            raise BoardError(str(exc)) from exc
        return self.read(user_id)
