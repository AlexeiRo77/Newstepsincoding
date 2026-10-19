"""Sign-up, login, logout and "who am I" — `/api/auth/*`."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth import (
    COOKIE_NAME,
    clear_session_cookie,
    current_user,
    dummy_password_hash,
    hash_password,
    normalize_email,
    password_problem,
    read_session,
    set_session_cookie,
    verify_password,
)
from app.db import get_session
from app.models import User
from app.ratelimit import LOGIN_FAILURES, LOGIN_FAILURES_PER_ADDRESS, SIGNUPS, client_key, enforce

router = APIRouter(prefix="/api/auth", tags=["auth"])


class Credentials(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: uuid.UUID
    email: str


def _out(user: User) -> UserOut:
    return UserOut(id=user.id, email=user.email)


@router.post("/signup", response_model=UserOut, status_code=201)
def signup(body: Credentials, request: Request, response: Response, session: Session = Depends(get_session)):
    """Create an account and sign it in. 409 if the email is taken; 429 past the per-IP sign-up limit."""
    problem = password_problem(body.password)
    if problem:
        raise HTTPException(status_code=422, detail=problem)
    enforce(SIGNUPS, client_key(request))
    user = User(email=normalize_email(body.email), password_hash=hash_password(body.password))
    session.add(user)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(status_code=409, detail="email_taken") from None
    set_session_cookie(response, user)
    return _out(user)


@router.post("/login", response_model=UserOut)
def login(body: Credentials, request: Request, response: Response, session: Session = Depends(get_session)):
    """One answer for an unknown email and a wrong password, at the same bcrypt cost; 429 past the per-IP
    failed-login limits (app.ratelimit), which a successful login does not use up."""
    email = normalize_email(body.email)
    address = client_key(request)
    account = f"{address} {email}"
    enforce(LOGIN_FAILURES_PER_ADDRESS, address)
    try:
        enforce(LOGIN_FAILURES, account)
    except HTTPException:
        LOGIN_FAILURES_PER_ADDRESS.release(address)
        raise
    user = session.scalars(select(User).where(User.email == email)).first()
    if user is None:
        verify_password(body.password, dummy_password_hash())
        raise HTTPException(status_code=401, detail="invalid_credentials")
    if not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="invalid_credentials")
    LOGIN_FAILURES_PER_ADDRESS.release(address)
    LOGIN_FAILURES.release(account)
    set_session_cookie(response, user)
    return _out(user)


@router.post("/logout")
def logout(request: Request, response: Response, session: Session = Depends(get_session)):
    """End the session everywhere: bump the epoch (retiring every cookie for this user) and clear it."""
    claims = read_session(request.cookies.get(COOKIE_NAME))
    if claims is not None:
        user = session.get(User, claims.user_id)
        if user is not None and user.session_epoch == claims.epoch:
            user.session_epoch += 1
            session.commit()
    clear_session_cookie(response)
    return {"ok": True}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(current_user)):
    return _out(user)
