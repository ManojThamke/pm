# Project Management MVP Plan

## Working agreements

- Each part is an approval gate. The agent must complete the checklist, tests, and success criteria for the current part, then stop for user approval before starting the next part.
- Use MVC boundaries throughout the application:
  - Models contain domain types, validation, persistence schemas, and serialization.
  - Controllers contain HTTP handlers, application actions, and orchestration.
  - Views contain React components, page composition, and user-facing states.
  - Shared pure domain logic belongs in a clearly named service or utility module; it must not be hidden inside a view or controller.
- Organize by responsibility and feature. Keep pages/routes thin, keep reusable UI in `frontend/src/components/`, keep frontend domain and API code in `frontend/src/lib/`, and keep backend models, controllers/routes, and services in separate modules under `backend/`.
- Keep names predictable and files small enough to review. Do not add duplicate helpers or catch-all modules.
- Format all edited code with the repository's configured tools. A part is not complete if lint, type-check, build, or the relevant tests fail.
- Unit coverage must be at least 100% for the unit-test scope introduced or changed in each part. Integration tests must exercise real boundaries (browser-to-frontend, frontend-to-API, or API-to-database as applicable), including success and failure paths.
- Do not commit secrets. Read the OpenRouter key from the existing environment configuration only on the server.
- Keep documentation in `docs/` and update directly related documentation as implementation decisions change.

## Part 1: Plan and repository guidance

### Checklist

- [x] Review the existing frontend demo, tests, package scripts, and repository guidance.
- [x] Expand this plan with implementation checklists, test requirements, and measurable success criteria.
- [x] Add `frontend/AGENTS.md` describing the current frontend structure and local workflows.
- [x] Obtain explicit user approval of this plan before starting Part 2.

### Tests and verification

- Documentation-only part; no application test run is required.
- Verify that the plan names a test and success criterion for every later part and that the frontend guide matches the existing files and commands.

### Success criteria

- The plan is approved by the user.
- Every implementation part has an actionable checklist, validation strategy, and completion criteria.
- Frontend contributors can locate the current entry point, components, domain logic, unit tests, and browser tests without guessing.

## Part 2: Scaffolding

### Checklist

- [x] Add a minimal Docker image and compose/run configuration that uses `uv` for the Python environment.
- [x] Create the FastAPI application entry point and a health or hello-world route.
- [x] Add backend MVC directories for models, controllers/routes, and services without premature abstractions.
- [x] Add cross-platform start and stop scripts for Windows, macOS, and Linux.
- [x] Serve a minimal static HTML response from the backend at `/` and document the local command.
- [x] Keep environment loading server-side and add a safe example environment configuration without secrets.
- [x] Add formatting, linting, type-checking, and test commands for the backend and document them.

### Tests and verification

- [x] Backend unit tests cover route behavior and service error handling at 100% unit coverage.
- [x] Integration test starts the application and verifies `/` and the health/API route over HTTP.
- [x] Build the Docker image and run the container using the documented start script.
- [x] Verify start and stop scripts on the supported host shells where available.

### Success criteria

- A fresh checkout can start one local container with one documented command.
- `GET /` returns the example HTML and the API route returns the documented JSON response.
- The container exits cleanly through the stop script and does not expose the OpenRouter key.

## Part 3: Add the existing frontend

### Checklist

- [x] Configure Next.js for a deterministic static export compatible with FastAPI static serving.
- [x] Preserve the existing Kanban demo behavior and color system while moving the build output into the container.
- [x] Keep the page/view composition thin and isolate board state transitions in domain/model-facing modules.
- [x] Add the frontend build step to Docker and serve the generated assets from FastAPI at `/`.
- [x] Document frontend development, production build, and container-serving workflows.

### Tests and verification

- [x] Unit-test all changed model, state, and component behavior with 100% unit coverage for the changed scope.
- [x] Run lint, type-check, production build, and the complete unit suite.
- [x] Run Playwright integration tests against the built application served by FastAPI, not only the Next.js dev server.
- [x] Verify browser navigation, five columns, add/remove, rename, and drag-and-drop behavior.

### Success criteria

- [x] The container serves the built Kanban board at `/` with no Next.js dev server dependency.
- [x] Existing user-visible demo behavior remains intact.
- [x] The documented build and test commands pass from a clean dependency install.

## Part 4: Fake user sign-in

### Checklist

- [x] Add a small authentication model and controller boundary for the hardcoded MVP credentials `user` and `password`.
- [x] Add a view for sign-in, validation, loading, and invalid-credential states.
- [x] Protect the board view and provide a logout action.
- [x] Keep the design ready for multiple users without implementing unnecessary account features.
- [x] Define the MVP session mechanism and its security limitations in the documentation.

### Tests and verification

- [x] Unit-test credential validation, session state transitions, guards, and logout with 100% unit coverage for the changed scope.
- [x] Add integration tests for unauthenticated redirect, invalid credentials, successful login, refresh behavior, and logout.
- [ ] Verify protected API behavior if authentication reaches the backend in this part.
- [x] Run lint, type-check, build, unit, and browser integration suites.

### Success criteria

- A visitor cannot see the board until valid MVP credentials are submitted.
- Invalid credentials produce a clear error without revealing sensitive information.
- Login, refresh, and logout behavior is deterministic and covered by integration tests.

## Part 5: Database modeling

### Checklist

- [x] Propose the SQLite schema for users, boards, columns, cards, ordering, and any session-related data needed by the MVP.
- [x] Save the schema proposal as JSON in `docs/` and document relationships, constraints, defaults, and migration/initialization behavior.
- [x] Define how the single-board MVP maps to a future multi-user design.
- [x] Define API/domain payload shapes separately from persistence rows.
- [ ] Obtain explicit user sign-off before implementing the schema.

### Tests and verification

- [x] Validate the schema JSON with a repeatable test or validation command.
- [x] Test representative serialization/deserialization examples and invalid data cases at 100% unit coverage for the modeling code.
- [x] Review indexes and uniqueness constraints against the planned API operations.

### Success criteria

- The schema document is internally consistent, machine-readable, and approved by the user.
- The design supports one board per user now and multiple users later without a breaking rewrite.
- No database implementation starts before approval.

## Part 6: Backend board API

### Checklist

- [x] Initialize SQLite automatically when the database file is absent.
- [x] Implement repository/model code for users, boards, columns, and cards.
- [x] Implement controller routes to read and update the signed-in user's board.
- [x] Validate payloads and enforce ownership and ordering invariants at the controller/service boundary.
- [x] Return explicit, consistent error responses for invalid input, missing records, and persistence failures.
- [x] Keep database access out of route handlers except through the repository/service layer.

### Tests and verification

- [x] Unit-test models, validation, repositories, services, and controllers with 100% unit coverage for all new backend modules.
- [x] Add API integration tests for initialization, reads, updates, ordering, invalid payloads, ownership, and persistence across app instances.
- [x] Run the full backend suite and a clean-database test.

### Success criteria

- A new database is created automatically and contains the approved initial board.
- Authorized requests can read and mutate only their own board.
- Invalid updates are rejected without partial writes, and tests prove persistence after restart.

## Part 7: Frontend and backend integration

### Checklist

- [ ] Replace frontend-only board state with a typed API client and controller-facing hooks/actions.
- [ ] Add loading, empty, optimistic or pending, success, and error states without hiding failures.
- [ ] Persist rename, add, delete, and drag-and-drop operations through the backend.
- [ ] Refresh or reconcile board state after every successful mutation.
- [ ] Keep API DTOs separate from UI component props where their responsibilities differ.
- [ ] Update the container routing so frontend asset requests and API requests coexist.

### Tests and verification

- [ ] Unit-test API client, mapping, state transitions, and failure states at 100% unit coverage for changed frontend scope.
- [ ] Run backend API integration tests and browser integration tests against the complete container.
- [ ] Cover reload persistence, concurrent-looking sequential edits, network errors, and unauthorized responses.
- [ ] Run lint, type-check, production build, and all unit/e2e suites.

### Success criteria

- Board changes survive a page reload and a backend restart.
- The UI never silently reports a successful mutation when the API fails.
- Browser tests prove the complete user flow from login through persisted board edits.

## Part 8: OpenRouter connectivity

### Checklist

- [ ] Add a server-only OpenRouter client configured from `OPENROUTER_API_KEY`.
- [ ] Use the selected free OpenRouter model through configuration rather than hardcoding secrets.
- [ ] Add a minimal backend AI service and a diagnostic route or test-only operation for `2+2`.
- [ ] Add timeout, response validation, and explicit error reporting consistent with backend conventions.
- [ ] Document local configuration and ensure keys are excluded from logs and client bundles.

### Tests and verification

- [ ] Unit-test request construction, configuration validation, response parsing, timeout, and provider failures at 100% unit coverage for new code.
- [ ] Mock provider calls in deterministic tests.
- [ ] Run one opt-in connectivity test using a real key; do not make normal CI depend on network access.
- [ ] Verify the diagnostic response contains the expected answer without exposing credentials.

### Success criteria

- A configured local environment can complete the `2+2` provider call.
- Missing keys and provider failures produce actionable server errors.
- No secret appears in frontend assets, test output, or application logs.

## Part 9: Structured AI board operations

### Checklist

- [ ] Define and document the structured response schema for assistant text and optional board updates.
- [ ] Send the current board JSON, user question, and conversation history on every AI request.
- [ ] Validate structured output before applying any board update.
- [ ] Apply updates through the same board service and invariants used by normal API mutations.
- [ ] Reject malformed, unauthorized, or conflicting AI operations explicitly and preserve the prior board.
- [ ] Add request limits and history handling appropriate for the local MVP.

### Tests and verification

- [ ] Unit-test prompt construction, history serialization, structured parsing, validation, and update application at 100% coverage for new code.
- [ ] Mock valid, empty, malformed, and malicious-looking provider outputs.
- [ ] Add API integration tests proving board state is unchanged on invalid AI output and changed only on valid output.
- [ ] Add regression tests for every supported card/column operation.

### Success criteria

- Every AI request includes the required board snapshot and conversation context.
- The API returns a predictable response shape.
- Only validated updates can change the board, and all failure paths are observable to the caller.

## Part 10: AI chat sidebar

### Checklist

- [ ] Add a responsive sidebar view for conversation history, input, loading, errors, and assistant responses.
- [ ] Add a typed frontend controller/API client for AI chat.
- [ ] Render board updates from validated responses and refresh the board from the backend after an update.
- [ ] Preserve normal Kanban interactions while chat is open, including keyboard and focus accessibility.
- [ ] Add empty, slow, failed, and retry states without silent fallbacks.
- [ ] Update user-facing documentation with the completed local workflow.

### Tests and verification

- [ ] Unit-test chat state, request mapping, response mapping, update refresh, and error handling at 100% coverage for changed frontend scope.
- [ ] Add browser integration tests for sending a message, displaying a response, loading/error states, and an AI-created or moved card appearing on the board.
- [ ] Run the complete backend and frontend suites against the container.
- [ ] Run formatting, lint, type-check, production build, and accessibility-focused checks available in the repository.

### Success criteria

- A signed-in user can hold a complete chat interaction in the sidebar.
- A valid AI board update is visible in the Kanban without a manual page reload.
- The board remains usable and consistent when AI calls fail or return no update.