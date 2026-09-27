# Frontend contributor guide

## Scope

This directory contains the Next.js frontend for the Project Management MVP. It is currently a client-side Kanban demo. The backend and Docker serving path are planned work; do not assume that API persistence or authentication already exists.

## Current structure

- `src/app/` contains the Next.js app entry points and global styles. `src/app/page.tsx` composes the home view.
- `src/components/` contains the Kanban view components:
  - `KanbanBoard.tsx` owns the current in-memory board state and drag lifecycle.
  - `KanbanColumn.tsx` renders a droppable column, inline title editing, and the add-card form.
  - `KanbanCard.tsx` renders a sortable card and its remove action.
  - `KanbanCardPreview.tsx` renders the drag overlay.
  - `NewCardForm.tsx` owns the add-card form state and validation.
- `src/lib/kanban.ts` contains the board, column, and card types, initial demo data, ID creation, and pure card movement logic.
- `src/test/` contains shared Vitest setup and type declarations.
- `src/**/*.test.tsx` and `src/**/*.test.ts` contain unit/component tests.
- `tests/` contains Playwright browser integration tests.
- `vitest.config.ts` configures jsdom, React, path aliases, and V8 coverage.
- `playwright.config.ts` starts the Next.js dev server and runs Chromium tests against `http://127.0.0.1:3000`.

## Local commands

Run these commands from `frontend/`:

```bash
npm install
npm run dev
npm run lint
npm run test:unit
npm run test:e2e
npm run test:all
npm run build
```

Use `npm run test:unit -- --coverage` when checking coverage locally. New or changed unit-test scope must maintain 100% coverage. Browser tests should cover user-visible flows and real component wiring rather than duplicating every pure-function case.

## Implementation conventions

- Use TypeScript with the existing `@/*` import alias and React function components.
- Keep components focused on rendering and user interaction. Put pure board operations and domain types in `src/lib/` or a clearly named feature module.
- When backend integration is added, keep request/response mapping in a typed client/controller-facing module rather than embedding fetch calls throughout components.
- Prefer existing `dnd-kit` patterns for drag-and-drop. Preserve stable `data-testid` values used by browser tests unless a test and its contract are updated together.
- Use the existing CSS variables and Tailwind utility style in `src/app/globals.css`; do not introduce a second styling system.
- Surface loading and error states explicitly. Do not catch errors and silently return a successful-looking UI state.
- Keep page files thin and organize new code by feature and responsibility. Avoid catch-all files such as `utils.ts` or `components/index.ts` unless there is a concrete shared need.
- Add or update tests with every behavior change. Keep pure logic in unit tests and complete user flows in Playwright integration tests.
- Format and lint changed files using the configured project tooling before handing off work.

## Planned MVC boundary

For future work, treat the frontend as a view plus client-side controller over backend models:

- Models: typed DTOs and board-facing domain data in `src/lib/`.
- Controllers: typed API clients and feature hooks/actions that coordinate requests and state.
- Views: `src/app/` pages and `src/components/` presentation and interaction components.

The current `KanbanBoard` combines demo controller state and view composition because this is the starting point. Split those responsibilities only when the corresponding backend or authentication feature is implemented; avoid speculative abstractions.
