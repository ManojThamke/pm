# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Read `AGENTS.md` (business requirements, color scheme, coding standards) and `docs/PLAN.md` before starting work. Subdirectory `AGENTS.md` files in `backend/` and `frontend/` add area-specific conventions.

## Working agreements (from docs/PLAN.md)

- Work proceeds in numbered Parts. Each Part is an approval gate: finish its checklist, tests, and success criteria, update the checkboxes in `docs/PLAN.md`, then stop for user approval before the next Part.
- Keep MVC boundaries: models (domain types, validation, persistence), controllers (HTTP handlers, orchestration), views (React components/pages).
- Unit coverage must stay at 100% (backend enforces this via pytest `--cov-fail-under=100`).
- Keep it simple, no over-engineering, no emojis. Identify root cause with evidence before fixing issues.

## Commands

Backend (run from `backend/`, managed with `uv`):

```bash
uv run pytest                                  # all tests + 100% coverage gate
uv run pytest tests/test_api.py::test_name     # single test
uv run ruff check . && uv run ruff format .    # lint / format
uv run uvicorn app.main:app --reload           # dev server on :8000
RUN_OPENROUTER_REAL=1 uv run pytest tests/test_openrouter_real.py  # opt-in real API call
```

Frontend (run from `frontend/`):

```bash
npm run dev                       # Next.js dev server (no backend)
npm run lint
npm run build                     # static export to frontend/out/
npm run test:unit                 # Vitest; add -- --coverage to check coverage
npx vitest run src/lib/kanban.test.ts   # single unit test file
npm run test:e2e                  # Playwright
```

Playwright's `webServer` (Windows-specific, PowerShell) deletes `.playwright-data/e2e.sqlite3*`, runs `npm run build`, then starts FastAPI using `../.venv/Scripts/python.exe` (the root-level venv) with `PM_DATABASE_PATH` pointing at the e2e DB. E2E tests therefore hit the real static export served by FastAPI on :8000, not the Next dev server.

Docker: `scripts/start.sh` / `scripts/start.ps1` build the `pm-app` image and run it on port 8000 with `--env-file .env`; `scripts/stop.*` stop it.

## Architecture

Single container: a multi-stage `Dockerfile` builds the Next.js static export (`output: "export"`) in a Node stage and copies it into `backend/static`, which FastAPI mounts at `/`. There is no Next.js server in production.

Static directory resolution in `backend/app/main.py`: `STATIC_DIR` env var, else `frontend/out` if it exists, else `backend/static`.

Backend layers (`backend/app/`):
- `controllers/` - FastAPI routers, all mounted under `/api` via `routes.py`. `board.py` also defines `DB_PATH` (env `PM_DATABASE_PATH`, default `data/project-management.sqlite3`) and the `current_user` dependency that parses HTTP Basic auth and verifies against the users table.
- `services/` - `BoardService` enforces board invariants; `openrouter.py` builds prompts, calls OpenRouter, and parses/validates the model's JSON response.
- `repositories/` - SQLite access for boards/users.
- `models/` - `database.py` (schema init, seed user `user`/`password` with PBKDF2 hash, seeded 5-column board) and `domain.py` (Pydantic models shared by API and AI parsing).

Auth: the frontend's sign-in is client-side; it stores a Basic authorization header in `sessionStorage` and sends it on every `/api/board` and `/api/ai/*` request. The backend validates credentials per request.

AI flow (`POST /api/ai/board-operation`, contract in `docs/AI-BOARD-OPERATIONS.md`): the client sends the full board snapshot, the question, and chat history. The backend rejects stale snapshots (409), asks OpenRouter for `{assistant_response, board_update}`, validates `board_update` as a complete board through the same domain models and `BoardService` used by normal updates, and persists only if valid. Provider errors return 502, invalid operations 400. OpenRouter config comes from env: `OPENROUTER_API_KEY` (required, in root `.env`), `OPENROUTER_MODEL` (default `openrouter/free`), `OPENROUTER_TIMEOUT`.

Frontend (`frontend/src/`):
- `lib/` - domain types and pure board logic (`kanban.ts`), typed API clients (`boardApi.ts`, `aiApi.ts`), auth storage (`auth.ts`). Keep fetch calls here, not in components.
- `components/` - `KanbanBoard` (board state, dnd-kit drag lifecycle), columns/cards, `AiChatSidebar`.
- `app/` - thin page composition and `AuthGate`/`SignInForm`.
- Preserve existing `data-testid` values used by Playwright tests.

Further docs: `docs/DATABASE.md` and `docs/database-schema.json` (schema), `docs/OPENROUTER.md` (provider integration).
