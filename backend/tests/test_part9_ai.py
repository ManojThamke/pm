import json

import pytest
from fastapi import HTTPException

from app.controllers.ai import board_operation
from app.models.domain import (
    Board,
    BoardOperationRequest,
    Card,
    Column,
    ConversationMessage,
)
from app.services.openrouter import (
    OpenRouterConfigurationError,
    OpenRouterProviderError,
    build_board_operation_prompt,
    parse_board_operation_response,
    serialize_history,
)


def board() -> Board:
    return Board(
        columns=[Column(id="col-1", title="Todo", cardIds=["card-1"])],
        cards={"card-1": Card(id="card-1", title="Task", details="Details")},
    )


def test_prompt_and_history_are_json_and_limited() -> None:
    history = [ConversationMessage(role="user", content="hello")]
    serialized = serialize_history(history)
    assert json.loads(serialized) == [{"role": "user", "content": "hello"}]
    prompt = build_board_operation_prompt(board(), "move it", history)
    assert "CURRENT_BOARD_JSON" in prompt
    assert "move it" in prompt
    with pytest.raises(OpenRouterProviderError, match="too large"):
        build_board_operation_prompt(board(), "x" * 24000, [])


@pytest.mark.parametrize(
    "content",
    [
        "not json",
        '{"assistant_response": "", "board_update": null}',
        '{"assistant_response": "ok", "board_update": null, "extra": true}',
    ],
)
def test_structured_parser_rejects_invalid_outputs(content: str) -> None:
    with pytest.raises(OpenRouterProviderError):
        parse_board_operation_response(content)


def test_structured_parser_accepts_empty_and_markdown_wrapped() -> None:
    empty = parse_board_operation_response(
        '{"assistant_response":"ok","board_update":null}'
    )
    assert empty.board_update is None
    wrapped = parse_board_operation_response(
        '```json\n{"assistant_response":"ok","board_update":null}\n```'
    )
    assert wrapped.assistant_response == "ok"


@pytest.mark.parametrize(
    "value",
    [
        {"role": "system", "content": "x"},
        {"role": "user", "content": " "},
    ],
)
def test_request_rejects_invalid_history(value: dict[str, str]) -> None:
    with pytest.raises(ValueError):
        BoardOperationRequest(board=board(), question="x", history=[value])
    with pytest.raises(ValueError):
        BoardOperationRequest(board=board(), question=" ", history=[])


class FakeService:
    def __init__(self, current: Board) -> None:
        self.current = current
        self.updated: Board | None = None

    def read(self, _user_id: int) -> Board:
        return self.current

    def update(self, _user_id: int, value: Board) -> Board:
        self.updated = value
        return value


class FakeProvider:
    def __init__(self, answer: str) -> None:
        self.answer = answer

    def ask(self, _prompt: str) -> str:
        return self.answer


def request(current: Board) -> BoardOperationRequest:
    return BoardOperationRequest(board=current, question="change", history=[])


def test_controller_applies_valid_update_and_empty_update() -> None:
    current = board()
    changed = current.model_copy(deep=True)
    changed.columns[0].title = "Done"
    service = FakeService(current)
    response = board_operation(
        request(current),
        user_id=1,
        openrouter=FakeProvider(
            json.dumps(
                {"assistant_response": "changed", "board_update": changed.model_dump()}
            )
        ),
        board_service=service,
    )
    assert response.assistant_response == "changed"
    assert service.updated == changed
    service = FakeService(current)
    board_operation(
        request(current),
        user_id=1,
        openrouter=FakeProvider('{"assistant_response":"answer","board_update":null}'),
        board_service=service,
    )
    assert service.updated is None


def test_controller_preserves_board_on_stale_or_invalid_provider() -> None:
    current = board()
    service = FakeService(current)
    stale = current.model_copy(deep=True)
    stale.columns[0].title = "stale"
    with pytest.raises(HTTPException) as error:
        board_operation(
            request(stale),
            1,
            FakeProvider('{"assistant_response":"x","board_update":null}'),
            service,
        )
    assert error.value.status_code == 409
    with pytest.raises(HTTPException) as error:
        board_operation(request(current), 1, FakeProvider("malicious"), service)
    assert error.value.status_code == 502
    assert service.updated is None


def test_controller_maps_configuration_and_update_errors() -> None:
    current = board()
    service = FakeService(current)

    class ConfigProvider:
        def ask(self, _prompt: str) -> str:
            raise OpenRouterConfigurationError("missing")

    with pytest.raises(HTTPException) as error:
        board_operation(request(current), 1, ConfigProvider(), service)
    assert error.value.status_code == 503

    class FailingService(FakeService):
        def update(self, _user_id: int, _value: Board) -> Board:
            from app.services.board import BoardError

            raise BoardError("conflict")

    changed = current.model_copy(deep=True)
    changed.columns[0].title = "Done"
    with pytest.raises(HTTPException) as error:
        board_operation(
            request(current),
            1,
            FakeProvider(
                json.dumps(
                    {"assistant_response": "x", "board_update": changed.model_dump()}
                )
            ),
            FailingService(current),
        )
    assert error.value.status_code == 400
