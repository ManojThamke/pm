# Code Review

## Overview

Review date: 2026-09-28. Scope: Full project review across frontend, backend, Docker, scripts, and documentation.

---

## Architecture and Structure

**Strengths**
- Clean MVC separation across backend layers: models, controllers, services, repositories
- Frontend follows typed API client pattern with boardApi.ts, aiApi.ts, auth.ts in src/lib/
- Multi-stage Dockerfile builds Next.js static export and copies into FastAPI image
- Pydantic domain models with extra=forbid validation enforce schema integrity
- 100% backend test coverage enforced via pytest --cov-fail-under=100

**Concerns**
- main.py triggers initialize_database(DB_PATH) at import time as a side effect
- service() in board.py calls initialize_database(DB_PATH) on every request
- service dependency creates new BoardService per request
- data/project-management.sqlite3 is not in .gitignore

---

## Frontend

**Strengths**
- Good separation of pure logic (kanban.ts, auth.ts) from React components
- Proper use of dnd-kit for drag-and-drop
- Typed API clients with proper error mapping
- AuthGate and SignInForm handle authentication flow cleanly
- AiChatSidebar handles loading, error, and retry states explicitly
- Playwright integration tests exercise real user flows

**Issues**
- KanbanColumn.tsx uses key with column.title causing React re-mounts on rename
- AiChatSidebar.tsx catch block has setMessages(messages) no-op
- AuthGate.tsx uses setTimeout for initialization
- SignInForm.tsx uses btoa(); sessionStorage is XSS-accessible
- playwright.config.ts uses hardcoded powershell command
- frontend/AGENTS.md is outdated

---

## Backend

**Strengths**
- Pydantic models with extra=forbid and field validators
- BoardService enforces invariants correctly
- OpenRouterClient handles errors cleanly
- PBKDF2-HMAC-SHA256 password hashing

**Issues**
- BoardRepository.save() position-shifting trick is fragile for large boards
- SEED_CARDS has hardcoded positions mapping
- service() calls initialize_database on every request
- ai.py stale snapshot check does not verify user ownership
- Several tests bypass FastAPI Depends system

---

## Testing

**Strengths**
- Comprehensive backend unit test coverage at 100%
- Playwright integration tests cover full user flows
- Opt-in real OpenRouter test gated behind RUN_OPENROUTER_REAL=1

**Issues**
- test_openrouter.py has redundant assertions
- No frontend unit test for auth.ts authorization functions
- KanbanBoard.test.tsx lacks drag-and-drop component test

---

## Security

**Issues**
- .env contains a real OpenRouter API key that should be rotated
- data/project-management.sqlite3 is not in .gitignore
- Client-side auth stores Basic auth in sessionStorage (XSS risk)
- Hardcoded password password is an MVP limitation

---

## Documentation

**Strengths**
- docs/PLAN.md is comprehensive with 10 parts
- docs/DATABASE.md and docs/database-schema.json are consistent

**Issues**
- frontend/AGENTS.md is outdated
- docs/PLAN.md Part 10 has unchecked items
- No docs/code_review.md existed prior to this review

---

## Summary of Critical Items

1. Add data/ to .gitignore
2. Fix KanbanColumn.tsx input key
3. Fix AiChatSidebar.tsx catch block
4. Remove initialize_database from per-request service()
5. Update frontend/AGENTS.md
6. Rotate the OpenRouter API key
7. Fix BoardRepository.save() position shifting
8. Cross-platform playwright.config.ts
