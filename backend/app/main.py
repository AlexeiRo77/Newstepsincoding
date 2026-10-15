"""The FastAPI application. Run with `uvicorn app.main:app` from `backend/`."""

from __future__ import annotations

from fastapi import Depends, FastAPI
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.auth import resolve_session_secret
from app.db import get_session
from app.routes import auth

# Refuse to start with a forgeable signing key outside local development.
resolve_session_secret()

app = FastAPI(title="Newstepsincoding API")
app.include_router(auth.router)


@app.get("/api/health")
def health(session: Session = Depends(get_session)):
    """Liveness plus a database round-trip."""
    session.execute(text("SELECT 1"))
    return {"ok": True}
