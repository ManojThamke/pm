import base64
import sqlite3
from pathlib import Path

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.controllers import board as board_controller
from app.main import app
from app.models.database import (
    connect,
    initialize_database,
    password_hash,
    utc_now,
    verify_password,
)
from app.models.domain import Board, Card, Column
from app.repositories.board import BoardRepository
from app.services.board import AuthenticationError, BoardError, BoardService


def credentials(username: str = "user", password: str = "password") -> dict[str, str]:
    token = base64.b64encode(f"{username}:{password}".encode()).decode()
    return {"Authorization": f"Basic {token}"}


@pytest.fixture
def database(tmp_path: Path) -> Path:
    path = tmp_path / "nested" / "test.sqlite3"
    initialize_database(path)
    return path


def test_password_hashing_and_malformed_values() -> None:
    salt = b"0123456789abcdef"
    encoded = password_hash("secret", salt)
    assert encoded.startswith("pbkdf2_sha256$120000$")
    assert verify_password("secret", encoded)
    assert not verify_password("wrong", encoded)
    assert not verify_password("secret", "bad")
    assert not verify_password("secret", "a$b$c$d$e")
    assert not verify_password("secret", "a$not-a-number$00$00")


def test_connect_configures_sqlite_and_initialization_is_idempotent(
    database: Path,
) -> None:
    with connect(database) as db:
        assert db.execute("PRAGMA foreign_keys").fetchone()[0] == 1
        assert db.execute("PRAGMA journal_mode").fetchone()[0] == "wal"
        counts = [
            db.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
            for table in ("users", "boards", "columns", "cards")
        ]
    initialize_database(database)
    with connect(database) as db:
        assert counts == [
            db.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
            for table in ("users", "boards", "columns", "cards")
        ]
    assert utc_now().endswith("+00:00")


@pytest.mark.parametrize(
    "model,data",
    [
        (Card, {"id": "", "title": "t", "details": "d"}),
        (Card, {"id": "c", "title": " ", "details": "d"}),
        (Card, {"id": "c", "title": "t", "details": ""}),
        (Column, {"id": "", "title": "t"}),
        (Column, {"id": "c", "title": " "}),
    ],
)
def test_domain_rejects_blank_values(model: type, data: dict) -> None:
    with pytest.raises(ValidationError):
        model(**data)


def test_domain_rejects_extra_fields_and_builds_dtos() -> None:
    with pytest.raises(ValidationError):
        Card(id="c", title="t", details="d", extra="x")
    board = Board(
        columns=[Column(id="col", title="To do")],
        cards={},
    )
    assert board.columns[0].cardIds == []


def test_repository_user_load_and_missing_board(database: Path) -> None:
    repository = BoardRepository(database)
    user = repository.user("user")
    assert user and user.username == "user"
    assert repository.user("missing") is None
    board = repository.load(user.id)
    assert board and len(board.columns) == 5 and len(board.cards) == 8
    assert repository.load(9999) is None


def test_repository_save_updates_order_and_rejects_missing_board(
    database: Path,
) -> None:
    repository = BoardRepository(database)
    user = repository.user("user")
    assert user is not None
    board = repository.load(user.id)
    assert board is not None
    board.columns[0].title = "Renamed"
    board.columns[0].cardIds.reverse()
    repository.save(user.id, board)
    saved = repository.load(user.id)
    assert saved and saved.columns[0].title == "Renamed"
    assert saved.columns[0].cardIds == board.columns[0].cardIds
    with pytest.raises(LookupError):
        repository.save(9999, board)
    board.columns[0].id = "unknown"
    with pytest.raises(ValueError):
        repository.save(user.id, board)


def test_service_auth_read_and_update_invariants(database: Path) -> None:
    service = BoardService(BoardRepository(database))
    user_id = service.authenticate("user", "password")
    assert user_id > 0
    with pytest.raises(AuthenticationError):
        service.authenticate("user", "wrong")
    with pytest.raises(AuthenticationError):
        service.authenticate("missing", "password")
    board = service.read(user_id)
    assert len(board.cards) == 8
    with pytest.raises(BoardError):
        service.read(9999)

    cases = []
    missing_column = board.model_copy(deep=True)
    missing_column.columns.pop()
    cases.append(missing_column)
    missing_card = board.model_copy(deep=True)
    missing_card.cards.pop(next(iter(missing_card.cards)))
    cases.append(missing_card)
    duplicate_card = board.model_copy(deep=True)
    duplicate_card.columns[1].cardIds.append(duplicate_card.columns[0].cardIds[0])
    cases.append(duplicate_card)
    duplicate_column = board.model_copy(deep=True)
    duplicate_column.columns.append(
        duplicate_column.columns[0].model_copy(deep=True, update={"cardIds": []})
    )
    cases.append(duplicate_column)
    for invalid in cases:
        with pytest.raises(BoardError):
            service.update(user_id, invalid)

    updated = board.model_copy(deep=True)
    updated.columns[0].title = "Service update"
    assert service.update(user_id, updated).columns[0].title == "Service update"


def test_service_translates_repository_errors(database: Path, monkeypatch) -> None:
    repository = BoardRepository(database)
    service = BoardService(repository)
    board = repository.load(1)
    assert board is not None
    monkeypatch.setattr(
        repository,
        "save",
        lambda *_: (_ for _ in ()).throw(KeyError("x")),
    )
    with pytest.raises(BoardError, match="x"):
        service.update(1, board)


def test_current_user_error_paths(database: Path, monkeypatch) -> None:
    monkeypatch.setattr(board_controller, "DB_PATH", database)
    malformed = "Basic " + base64.b64encode(b"no-colon").decode()
    for header in (None, "Bearer abc", "Basic !!!", malformed):
        with pytest.raises(HTTPException) as error:
            board_controller.current_user(header)
        assert error.value.status_code == 401
    assert (
        board_controller.current_user(
            "Basic " + base64.b64encode(b"user:password").decode()
        )
        == 1
    )
    with pytest.raises(HTTPException):
        board_controller.current_user(
            "Basic " + base64.b64encode(b"user:wrong").decode()
        )


def test_controller_service_error_mappings(monkeypatch) -> None:
    class FailingService:
        def read(self, _user_id):
            raise BoardError("read failed")

        def update(self, _user_id, _payload):
            raise BoardError("update failed")

    failing = FailingService()
    with pytest.raises(HTTPException) as read_error:
        board_controller.get_board(1, failing)
    assert read_error.value.status_code == 404
    with pytest.raises(HTTPException) as update_error:
        board_controller.update_board(Board(columns=[], cards={}), 1, failing)
    assert update_error.value.status_code == 400


def test_http_board_routes_success_errors_and_persistence(
    database: Path, monkeypatch
) -> None:
    monkeypatch.setattr(board_controller, "DB_PATH", database)
    client = TestClient(app)
    assert client.get("/api/board").status_code == 401
    assert (
        client.get("/api/board", headers={"Authorization": "Basic !!!"}).status_code
        == 401
    )
    assert (
        client.get("/api/board", headers=credentials("user", "wrong")).status_code
        == 401
    )
    response = client.get("/api/board", headers=credentials())
    assert response.status_code == 200
    payload = response.json()
    payload["columns"][0]["title"] = "HTTP update"
    assert (
        client.put("/api/board", json=payload, headers=credentials()).status_code == 200
    )
    assert (
        client.get("/api/board", headers=credentials()).json()["columns"][0]["title"]
        == "HTTP update"
    )
    payload["columns"][0]["cardIds"].append(payload["columns"][0]["cardIds"][0])
    invalid = client.put("/api/board", json=payload, headers=credentials())
    assert invalid.status_code == 400
    assert (
        client.put(
            "/api/board", json={"columns": []}, headers=credentials()
        ).status_code
        == 422
    )

    new_client = TestClient(app)
    assert (
        new_client.get("/api/board", headers=credentials()).json()["columns"][0][
            "title"
        ]
        == "HTTP update"
    )


def test_repository_foreign_keys_are_enforced(database: Path) -> None:
    with pytest.raises(sqlite3.IntegrityError), connect(database) as db:
        db.execute(
            """INSERT INTO boards(
            user_id,name,created_at,updated_at
            ) VALUES(999,'x',?,?)""",
            (utc_now(), utc_now()),
        )
