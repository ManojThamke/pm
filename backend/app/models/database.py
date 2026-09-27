"""SQLite initialization and connection management."""

import hashlib
import secrets
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

SEED_COLUMNS = ["Backlog", "Discovery", "In Progress", "Review", "Done"]
SEED_CARDS = [
    (
        "Align roadmap themes",
        "Draft quarterly themes with impact statements and metrics.",
        0,
    ),
    (
        "Gather customer signals",
        "Review support tags, sales notes, and churn feedback.",
        0,
    ),
    (
        "Prototype analytics view",
        "Sketch initial dashboard layout and key drill-downs.",
        1,
    ),
    (
        "Refine status language",
        "Standardize column labels and tone across the board.",
        2,
    ),
    ("Design card layout", "Add hierarchy and spacing for scanning dense lists.", 2),
    ("QA micro-interactions", "Verify hover, focus, and loading states.", 3),
    ("Ship marketing page", "Final copy approved and asset pack delivered.", 4),
    ("Close onboarding sprint", "Document release notes and share internally.", 4),
]


def password_hash(password: str, salt: bytes | None = None) -> str:
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 120_000)
    return f"pbkdf2_sha256$120000${salt.hex()}${digest.hex()}"


def verify_password(password: str, encoded: str) -> bool:
    try:
        _, rounds, salt, expected = encoded.split("$")
        actual = hashlib.pbkdf2_hmac(
            "sha256", password.encode(), bytes.fromhex(salt), int(rounds)
        ).hex()
        return secrets.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def connect(path: Path) -> sqlite3.Connection:
    path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("PRAGMA journal_mode = WAL")
    return connection


def initialize_database(path: Path) -> None:
    with connect(path) as db:
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
              id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE,
              password_hash TEXT NOT NULL, created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS boards (
              id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL UNIQUE,
              name TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
              FOREIGN KEY(user_id) REFERENCES users(id)
            );
            CREATE TABLE IF NOT EXISTS columns (
              id INTEGER PRIMARY KEY AUTOINCREMENT, board_id INTEGER NOT NULL,
              title TEXT NOT NULL, position INTEGER NOT NULL,
              UNIQUE(board_id, position), UNIQUE(board_id, title),
              FOREIGN KEY(board_id) REFERENCES boards(id)
            );
            CREATE TABLE IF NOT EXISTS cards (
              id INTEGER PRIMARY KEY AUTOINCREMENT, column_id INTEGER NOT NULL,
              title TEXT NOT NULL, details TEXT NOT NULL, position INTEGER NOT NULL,
              created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
              UNIQUE(column_id, position),
              FOREIGN KEY(column_id) REFERENCES columns(id)
            );
            CREATE INDEX IF NOT EXISTS idx_boards_user_id ON boards(user_id);
            CREATE INDEX IF NOT EXISTS idx_columns_board_position
              ON columns(board_id, position);
            CREATE INDEX IF NOT EXISTS idx_cards_column_position
              ON cards(column_id, position);
            """
        )
        user = db.execute("SELECT id FROM users WHERE username = 'user'").fetchone()
        if user is None:
            now = utc_now()
            db.execute(
                "INSERT INTO users(username,password_hash,created_at) VALUES(?,?,?)",
                ("user", password_hash("password"), now),
            )
            user = db.execute("SELECT id FROM users WHERE username = 'user'").fetchone()
        board = db.execute(
            "SELECT id FROM boards WHERE user_id = ?", (user["id"],)
        ).fetchone()
        if board is None:
            now = utc_now()
            cursor = db.execute(
                """INSERT INTO boards(
                user_id,name,created_at,updated_at
                ) VALUES(?,?,?,?)""",
                (user["id"], "Project board", now, now),
            )
            board_id = cursor.lastrowid
            column_ids: list[int] = []
            for position, title in enumerate(SEED_COLUMNS):
                column_ids.append(
                    db.execute(
                        "INSERT INTO columns(board_id,title,position) VALUES(?,?,?)",
                        (board_id, title, position),
                    ).lastrowid
                )
            positions = [0, 1, 0, 0, 1, 0, 0, 1]
            for (title, details, column), position in zip(SEED_CARDS, positions):
                db.execute(
                    """INSERT INTO cards(
                    column_id,title,details,position,created_at,updated_at
                    )
                    VALUES(?,?,?,?,?,?)""",
                    (column_ids[column], title, details, position, now, now),
                )
