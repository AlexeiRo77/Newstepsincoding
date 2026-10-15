"""Settings read from the environment. Every value has a local-development default, so a fresh clone
runs with no `.env` at all; `.env.example` at the repo root documents each one."""

from __future__ import annotations

import os

DEFAULT_DATABASE_URL = "postgresql+psycopg://app:app@localhost:5432/app"


def database_url() -> str:
    return os.environ.get("DATABASE_URL") or DEFAULT_DATABASE_URL


def app_env() -> str:
    """`local` for development. Anything else (or unset) is treated as a real deployment."""
    return os.environ.get("APP_ENV", "").strip().lower()


def is_local_env() -> bool:
    return app_env() == "local"


def frontend_url() -> str:
    return os.environ.get("FRONTEND_URL", "")
