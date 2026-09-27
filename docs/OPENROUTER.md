# OpenRouter connectivity

Part 8 adds one server-only diagnostic endpoint:

```text
GET /api/ai/diagnostic
Authorization: Basic <base64(user:password)>
```

The endpoint asks the configured OpenRouter free model `2+2` and returns
`{"answer":"4"}` (the provider may add surrounding text). Configure the backend
environment, never the frontend, with:

```text
OPENROUTER_API_KEY=...
OPENROUTER_MODEL=openrouter/free
OPENROUTER_TIMEOUT=15
```

`OPENROUTER_MODEL` and `OPENROUTER_TIMEOUT` are optional. When the model is
omitted, `openrouter/free` selects an available free model. The key is only read
by the backend, is not included in responses or logs, and is not copied into
the Docker image. Missing configuration returns HTTP 503; provider, timeout,
HTTP, and malformed-response failures return HTTP 502.

Normal tests mock HTTP. To explicitly test live connectivity, with the existing
local environment loaded, run:

```powershell
$env:RUN_OPENROUTER_REAL = "1"
uv run --project backend pytest backend/tests/test_openrouter_real.py -q
```

The free-model catalog and availability are controlled by OpenRouter and can
change independently of this application.

Structured board operations are documented in
[`AI-BOARD-OPERATIONS.md`](AI-BOARD-OPERATIONS.md). The frontend chat sidebar is
available after signing in.
