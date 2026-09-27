FROM node:22-bookworm-slim AS frontend-build

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /app
COPY backend/pyproject.toml ./backend/
RUN uv sync --project backend --no-dev
COPY backend/app ./backend/app
COPY --from=frontend-build /app/frontend/out ./backend/static

WORKDIR /app/backend
EXPOSE 8000
CMD ["uv", "run", "--no-dev", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
