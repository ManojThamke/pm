"""Normalized SQLite repository for board persistence."""

from pathlib import Path

from app.models.database import connect, utc_now
from app.models.domain import Board, Card, Column, UserRow


class BoardRepository:
    def __init__(self, path: Path):
        self.path = path

    def user(self, username: str) -> UserRow | None:
        with connect(self.path) as db:
            row = db.execute(
                "SELECT id,username,password_hash FROM users WHERE username=?",
                (username,),
            ).fetchone()
        return UserRow(**dict(row)) if row else None

    def load(self, user_id: int) -> Board | None:
        with connect(self.path) as db:
            board = db.execute(
                "SELECT id FROM boards WHERE user_id=?", (user_id,)
            ).fetchone()
            if not board:
                return None
            columns = db.execute(
                "SELECT id,title FROM columns WHERE board_id=? ORDER BY position",
                (board["id"],),
            ).fetchall()
            cards = db.execute(
                """SELECT cards.id,cards.title,cards.details,columns.id AS column_id
                   FROM cards JOIN columns ON columns.id=cards.column_id
                   WHERE columns.board_id=? ORDER BY cards.column_id,cards.position""",
                (board["id"],),
            ).fetchall()
        result_columns = [
            Column(id=f"col-{row['id']}", title=row["title"], cardIds=[])
            for row in columns
        ]
        by_column = {
            row["id"]: result_columns[index] for index, row in enumerate(columns)
        }
        result_cards: dict[str, Card] = {}
        for row in cards:
            card_id = f"card-{row['id']}"
            result_cards[card_id] = Card(
                id=card_id, title=row["title"], details=row["details"]
            )
            by_column[row["column_id"]].cardIds.append(card_id)
        return Board(columns=result_columns, cards=result_cards)

    def save(self, user_id: int, board: Board) -> None:
        with connect(self.path) as db:
            db.execute("BEGIN IMMEDIATE")
            db_row = db.execute(
                "SELECT id FROM boards WHERE user_id=?", (user_id,)
            ).fetchone()
            if not db_row:
                raise LookupError("board not found")
            board_id = db_row["id"]
            column_rows = db.execute(
                "SELECT id,position FROM columns WHERE board_id=? ORDER BY position",
                (board_id,),
            ).fetchall()
            column_ids = {f"col-{row['id']}": row["id"] for row in column_rows}
            if set(column_ids) != {column.id for column in board.columns}:
                raise ValueError("column IDs cannot be added or removed")
            now = utc_now()
            db.execute("UPDATE cards SET position=position + 1000000")
            for position, column in enumerate(board.columns):
                db.execute(
                    "UPDATE columns SET title=?,position=? WHERE id=?",
                    (column.title, position, column_ids[column.id]),
                )
                for card_position, card_id in enumerate(column.cardIds):
                    numeric_id = int(card_id.removeprefix("card-"))
                    card = board.cards[card_id]
                    db.execute(
                        """UPDATE cards SET column_id=?,title=?,details=?,
                        position=?,updated_at=? WHERE id=?""",
                        (
                            column_ids[column.id],
                            card.title,
                            card.details,
                            card_position,
                            now,
                            numeric_id,
                        ),
                    )
            db.execute("UPDATE boards SET updated_at=? WHERE id=?", (now, board_id))
