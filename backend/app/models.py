"""Database tables. A schema change here needs a matching Alembic revision in `migrations/versions/`."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    # Stored lower-cased (`app/auth.py::normalize_email`), so the unique index is case-insensitive in effect.
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(100))
    # Bumped on logout: every session cookie carries the epoch it was minted under, and a cookie whose
    # epoch no longer matches is refused (`app/auth.py::current_user`). This is what makes logout end the
    # session server-side, not just delete the cookie from one browser.
    session_epoch: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
