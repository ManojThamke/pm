from types import SimpleNamespace

import httpx
import pytest

from app.controllers.ai import client, diagnostic
from app.services import openrouter
from app.services.openrouter import (
    OpenRouterClient,
    OpenRouterConfig,
    OpenRouterConfigurationError,
    OpenRouterProviderError,
    diagnostic_answer,
)


def config() -> OpenRouterConfig:
    return OpenRouterConfig(api_key="server-secret", model="test/free", timeout=3)


def test_config_reads_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OPENROUTER_API_KEY", " key ")
    monkeypatch.setenv("OPENROUTER_MODEL", " model ")
    monkeypatch.setenv("OPENROUTER_TIMEOUT", "2.5")
    assert OpenRouterConfig.from_environment() == OpenRouterConfig("key", "model", 2.5)


@pytest.mark.parametrize(
    ("name", "value", "message"),
    [
        ("OPENROUTER_API_KEY", "", "OPENROUTER_API_KEY"),
        ("OPENROUTER_MODEL", "", "OPENROUTER_MODEL"),
        ("OPENROUTER_TIMEOUT", "nope", "OPENROUTER_TIMEOUT"),
        ("OPENROUTER_TIMEOUT", "0", "OPENROUTER_TIMEOUT"),
    ],
)
def test_config_rejects_invalid_environment(
    monkeypatch: pytest.MonkeyPatch, name: str, value: str, message: str
) -> None:
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    monkeypatch.delenv("OPENROUTER_MODEL", raising=False)
    monkeypatch.delenv("OPENROUTER_TIMEOUT", raising=False)
    monkeypatch.setenv("OPENROUTER_API_KEY", "key")
    monkeypatch.setenv(name, value)
    with pytest.raises(OpenRouterConfigurationError, match=message):
        OpenRouterConfig.from_environment()


def test_config_uses_default_model_and_timeout(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OPENROUTER_API_KEY", "key")
    monkeypatch.delenv("OPENROUTER_MODEL", raising=False)
    monkeypatch.delenv("OPENROUTER_TIMEOUT", raising=False)
    result = OpenRouterConfig.from_environment()
    assert result.model == "openrouter/free"
    assert result.model == openrouter.DEFAULT_MODEL
    assert result.timeout == openrouter.DEFAULT_TIMEOUT


def test_client_sends_request_and_parses_answer(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured: dict = {}

    def post(url: str, **kwargs: object) -> SimpleNamespace:
        captured.update(url=url, **kwargs)
        return SimpleNamespace(
            status_code=200,
            json=lambda: {"choices": [{"message": {"content": " 4 "}}]},
        )

    monkeypatch.setattr(openrouter.httpx, "post", post)
    assert OpenRouterClient(config()).ask("question") == "4"
    assert captured["url"] == openrouter.OPENROUTER_URL
    assert captured["headers"] == {
        "Authorization": "Bearer server-secret",
        "Content-Type": "application/json",
    }
    assert captured["json"] == {
        "model": "test/free",
        "messages": [{"role": "user", "content": "question"}],
    }
    assert captured["timeout"] == 3


@pytest.mark.parametrize(
    "exception",
    [httpx.TimeoutException("slow"), httpx.NetworkError("down")],
)
def test_client_maps_http_failures(
    monkeypatch: pytest.MonkeyPatch, exception: httpx.HTTPError
) -> None:
    def post(*_args: object, **_kwargs: object) -> object:
        raise exception

    monkeypatch.setattr(openrouter.httpx, "post", post)
    with pytest.raises(OpenRouterProviderError, match="request"):
        OpenRouterClient(config()).ask("question")


def test_client_maps_http_status(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        openrouter.httpx,
        "post",
        lambda *_args, **_kwargs: SimpleNamespace(status_code=429),
    )
    with pytest.raises(OpenRouterProviderError, match="HTTP 429"):
        OpenRouterClient(config()).ask("question")


@pytest.mark.parametrize(
    "body",
    [
        {"choices": []},
        {"choices": [{"message": {}}]},
        {"choices": [{"message": {"content": 4}}]},
        {"choices": [{"message": {"content": " "}}]},
        "not-json",
    ],
)
def test_client_rejects_invalid_response(
    monkeypatch: pytest.MonkeyPatch, body: object
) -> None:
    def response_json() -> object:
        if body == "not-json":
            raise ValueError("bad json")
        return body

    monkeypatch.setattr(
        openrouter.httpx,
        "post",
        lambda *_args, **_kwargs: SimpleNamespace(status_code=200, json=response_json),
    )
    with pytest.raises(OpenRouterProviderError, match="invalid response"):
        OpenRouterClient(config()).ask("question")


def test_diagnostic_answer_delegates() -> None:
    class FakeClient:
        def ask(self, prompt: str) -> str:
            assert prompt == "What is 2+2? Reply with only the answer."
            return "4"

    assert diagnostic_answer(FakeClient()) == "4"  # type: ignore[arg-type]


def test_route_success_and_client_factory(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("OPENROUTER_API_KEY", "key")
    assert isinstance(client(), OpenRouterClient)
    assert diagnostic(7, FakeOpenRouterClient()) == {"answer": "4"}


def test_route_maps_configuration_and_provider_errors() -> None:
    for error, status in (
        (OpenRouterConfigurationError("not configured"), 503),
        (OpenRouterProviderError("provider unavailable"), 502),
    ):
        with pytest.raises(Exception) as raised:
            diagnostic(7, RaisingClient(error))
        assert raised.value.status_code == status


class FakeOpenRouterClient:
    def ask(self, _prompt: str) -> str:
        return "4"


class RaisingClient:
    def __init__(self, error: Exception) -> None:
        self.error = error

    def ask(self, _prompt: str) -> str:
        raise self.error
