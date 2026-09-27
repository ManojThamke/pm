"""Small server-only client for the OpenRouter chat completions API."""

import os
from dataclasses import dataclass
from typing import Any

import httpx

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL = "qwen/qwen3.8-27b:free"
DEFAULT_TIMEOUT = 15.0


class OpenRouterError(Exception):
    """Base class for errors safe to expose to an API caller."""


class OpenRouterConfigurationError(OpenRouterError):
    """The server is not configured with the required provider settings."""


class OpenRouterProviderError(OpenRouterError):
    """The provider rejected the request or returned an invalid response."""


@dataclass(frozen=True)
class OpenRouterConfig:
    api_key: str
    model: str
    timeout: float = DEFAULT_TIMEOUT

    @classmethod
    def from_environment(cls) -> "OpenRouterConfig":
        api_key = os.getenv("OPENROUTER_API_KEY", "").strip()
        if not api_key:
            raise OpenRouterConfigurationError(
                "OPENROUTER_API_KEY is not configured on the server"
            )
        model = os.getenv("OPENROUTER_MODEL", DEFAULT_MODEL).strip()
        if not model:
            raise OpenRouterConfigurationError(
                "OPENROUTER_MODEL must not be empty"
            )
        timeout_value = os.getenv("OPENROUTER_TIMEOUT", str(DEFAULT_TIMEOUT)).strip()
        try:
            timeout = float(timeout_value)
        except ValueError as exc:
            raise OpenRouterConfigurationError(
                "OPENROUTER_TIMEOUT must be a positive number"
            ) from exc
        if timeout <= 0:
            raise OpenRouterConfigurationError(
                "OPENROUTER_TIMEOUT must be a positive number"
            )
        return cls(api_key=api_key, model=model, timeout=timeout)


class OpenRouterClient:
    """Make one chat completion request without leaking provider credentials."""

    def __init__(self, config: OpenRouterConfig) -> None:
        self.config = config

    def ask(self, prompt: str) -> str:
        payload = {
            "model": self.config.model,
            "messages": [{"role": "user", "content": prompt}],
        }
        try:
            response = httpx.post(
                OPENROUTER_URL,
                headers={
                    "Authorization": f"Bearer {self.config.api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
                timeout=self.config.timeout,
            )
        except httpx.TimeoutException as exc:
            raise OpenRouterProviderError("OpenRouter request timed out") from exc
        except httpx.HTTPError as exc:
            raise OpenRouterProviderError("OpenRouter request failed") from exc
        if response.status_code >= 400:
            raise OpenRouterProviderError(
                f"OpenRouter returned HTTP {response.status_code}"
            )
        try:
            body: Any = response.json()
            answer = body["choices"][0]["message"]["content"]
        except (ValueError, KeyError, IndexError, TypeError) as exc:
            raise OpenRouterProviderError(
                "OpenRouter returned an invalid response"
            ) from exc
        if not isinstance(answer, str) or not answer.strip():
            raise OpenRouterProviderError(
                "OpenRouter returned an invalid response"
            )
        return answer.strip()


def diagnostic_answer(client: OpenRouterClient) -> str:
    """Ask the provider the deliberately minimal Part 8 diagnostic question."""
    return client.ask("What is 2+2? Reply with only the answer.")
