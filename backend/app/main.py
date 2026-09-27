"""FastAPI application entry point."""

import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.controllers.routes import router

PROJECT_ROOT = Path(__file__).resolve().parents[2]
BACKEND_STATIC = PROJECT_ROOT / "backend" / "static"
FRONTEND_EXPORT = PROJECT_ROOT / "frontend" / "out"
STATIC_DIR = Path(os.environ["STATIC_DIR"]) if "STATIC_DIR" in os.environ else (
    FRONTEND_EXPORT if FRONTEND_EXPORT.is_dir() else BACKEND_STATIC
)

app = FastAPI(title="Project Management API")
app.include_router(router)
app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="frontend")
