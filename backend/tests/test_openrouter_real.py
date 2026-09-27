import os

import pytest

from app.services.openrouter import (
    OpenRouterClient,
    OpenRouterConfig,
    diagnostic_answer,
)


@pytest.mark.skipif(
    os.getenv("RUN_OPENROUTER_REAL") != "1",
    reason="opt-in real OpenRouter connectivity test",
)
def test_real_openrouter_diagnostic() -> None:
    answer = diagnostic_answer(
        OpenRouterClient(OpenRouterConfig.from_environment())
    )
    assert "4" in answer
