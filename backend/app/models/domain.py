"""Domain and API DTOs for the board."""

from pydantic import BaseModel, ConfigDict, Field, field_validator


class Card(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    title: str
    details: str

    @field_validator("id", "title", "details")
    @classmethod
    def non_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("must not be blank")
        return value


class Column(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    title: str
    cardIds: list[str] = Field(default_factory=list)

    @field_validator("id", "title")
    @classmethod
    def non_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("must not be blank")
        return value


class Board(BaseModel):
    model_config = ConfigDict(extra="forbid")
    columns: list[Column]
    cards: dict[str, Card]


class UserRow(BaseModel):
    id: int
    username: str
    password_hash: str


class BoardUpdate(Board):
    pass
