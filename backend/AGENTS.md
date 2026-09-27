The backend is a small FastAPI application managed by `uv`.

- `app/main.py` creates the application and serves `static/index.html` at `/`.
- `app/controllers/` contains HTTP route handlers.
- `app/services/` contains application logic.
- `app/models/` is reserved for domain models as features are added.
- `tests/` contains API unit tests. Run `uv run pytest` from `backend/`; the
  configured coverage gate is 100%.

Run locally with `uv run uvicorn app.main:app --reload` from `backend/`.
The root scripts build and run the Docker image without copying `.env` into it.