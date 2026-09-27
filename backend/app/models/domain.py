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


class ConversationMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")
    role: str
    content: str

    @field_validator("role")
    @classmethod
    def valid_role(cls, value: str) -> str:
        if value not in {"user", "assistant"}:
            raise ValueError("role must be user or assistant")
        return value

    @field_validator("content")
    @classmethod
    def non_blank_content(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("content must not be blank")
        return value


class BoardOperationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    board: Board
    question: str = Field(min_length=1, max_length=4000)
    history: list[ConversationMessage] = Field(default_factory=list, max_length=20)

    @field_validator("question")
    @classmethod
    def non_blank_question(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("question must not be blank")
        return value


class BoardOperationResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    assistant_response: str
    board_update: Board | None = None

    @field_validator("assistant_response")
    @classmethod
    def non_blank_response(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("assistant_response must not be blank")
        return value
