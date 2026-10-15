"""Password hashing and session cookies — the basic login/logout core of jaah-ai/jaah's `app/auth.py`.

A session is an HttpOnly cookie holding a signed, timestamped `{user_id, epoch}` (itsdangerous). Nothing
about the session is stored server-side except the user's `session_epoch`, which logout bumps so every
cookie minted before it stops working.
"""

from __future__ import annotations

import hmac
import os
import secrets
import uuid
from functools import lru_cache
from typing import NamedTuple
from urllib.parse import urlparse

import bcrypt
from fastapi import Depends, HTTPException, Request
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from sqlalchemy.orm import Session

from app.config import frontend_url, is_local_env
from app.db import get_session
from app.models import User

COOKIE_NAME = os.environ.get("SESSION_COOKIE_NAME", "session")
SESSION_MAX_AGE = 7 * 86400  # seconds

PASSWORD_MIN = 8
PASSWORD_MAX = 128

_DEV_SESSION_SECRET = "dev-session-secret-change-me"


SESSION_SECRET_MIN = 32
_LOCAL_HOSTS = {"", "localhost", "127.0.0.1", "frontend"}


def _served_locally() -> bool:
    """Whether FRONTEND_URL (if set) points at this machine — a second tripwire beside APP_ENV."""
    return (urlparse(frontend_url()).hostname or "") in _LOCAL_HOSTS


def resolve_session_secret() -> str:
    """The cookie-signing secret. The published dev value (or none) is accepted only when APP_ENV=local
    AND the app is served from localhost: a signing key that is in git lets anyone forge a session."""
    secret = os.environ.get("SESSION_SECRET", "")
    if secret and not hmac.compare_digest(secret.encode(), _DEV_SESSION_SECRET.encode()):
        if len(secret) < SESSION_SECRET_MIN and not is_local_env():
            raise RuntimeError(
                f"SESSION_SECRET must be at least {SESSION_SECRET_MIN} characters. "
                "Generate one with: openssl rand -hex 32"
            )
        return secret
    if not is_local_env() or not _served_locally():
        raise RuntimeError(
            "SESSION_SECRET must be set to a real value unless APP_ENV is 'local' and FRONTEND_URL is a "
            "localhost URL. Generate one with: openssl rand -hex 32"
        )
    return _DEV_SESSION_SECRET


def _serializer() -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(resolve_session_secret(), salt="session")


class SessionClaims(NamedTuple):
    user_id: uuid.UUID
    epoch: int


def create_session_token(user_id: uuid.UUID, epoch: int) -> str:
    return _serializer().dumps({"user_id": str(user_id), "epoch": epoch})


def read_session(token: str | None) -> SessionClaims | None:
    """The claims of a validly signed, unexpired cookie, or None. Fail closed on any odd shape."""
    if not token:
        return None
    try:
        payload = _serializer().loads(token, max_age=SESSION_MAX_AGE)
    except (BadSignature, SignatureExpired):
        return None
    if not isinstance(payload, dict):
        return None
    raw_id, epoch = payload.get("user_id"), payload.get("epoch")
    if not isinstance(raw_id, str) or not isinstance(epoch, int) or isinstance(epoch, bool):
        return None
    try:
        return SessionClaims(uuid.UUID(raw_id), epoch)
    except ValueError:
        return None


def set_session_cookie(response, user: User) -> None:
    """`samesite=lax` + HttpOnly; `Secure` everywhere except plain-http local development."""
    response.set_cookie(
        COOKIE_NAME,
        create_session_token(user.id, user.session_epoch),
        max_age=SESSION_MAX_AGE,
        httponly=True,
        samesite="lax",
        secure=not is_local_env() or frontend_url().startswith("https://"),
        path="/",
    )


def clear_session_cookie(response) -> None:
    response.delete_cookie(COOKIE_NAME, path="/")


# bcrypt reads at most 72 bytes of a password and bcrypt>=5 raises past that, so truncate explicitly.
_BCRYPT_MAX_BYTES = 72


def _bcrypt_input(password: str) -> bytes:
    return password.encode()[:_BCRYPT_MAX_BYTES]


def hash_password(password: str) -> str:
    rounds = int(os.environ.get("BCRYPT_ROUNDS", "12"))
    return bcrypt.hashpw(_bcrypt_input(password), bcrypt.gensalt(rounds=rounds)).decode()


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(_bcrypt_input(password), password_hash.encode())
    except ValueError:
        return False


@lru_cache(maxsize=1)
def dummy_password_hash() -> str:
    """Compared against when an email has no account, so a login costs the same bcrypt time either way
    and response timing cannot reveal which emails are registered."""
    return hash_password(secrets.token_urlsafe(32))


def normalize_email(email: str) -> str:
    return email.strip().lower()


def password_problem(password: str) -> str | None:
    """The one password rule, or None when the password is acceptable."""
    if len(password) < PASSWORD_MIN:
        return "password_too_short"
    if len(password) > PASSWORD_MAX:
        return "password_too_long"
    return None


def current_user(request: Request, session: Session = Depends(get_session)) -> User:
    """FastAPI dependency: the signed-in user, or 401. Add it to any route that needs a login."""
    claims = read_session(request.cookies.get(COOKIE_NAME))
    user = session.get(User, claims.user_id) if claims else None
    if user is None or user.session_epoch != claims.epoch:
        raise HTTPException(status_code=401, detail="not_authenticated")
    return user
