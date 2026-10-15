from app.auth import COOKIE_NAME, create_session_token, read_session

CREDS = {"email": "Ada@Example.com", "password": "correct horse"}


def test_signup_signs_in_and_me_returns_user(client):
    r = client.post("/api/auth/signup", json=CREDS)
    assert r.status_code == 201
    assert r.json()["email"] == "ada@example.com"
    assert client.get("/api/auth/me").json()["email"] == "ada@example.com"


def test_signup_rejects_duplicate_email_case_insensitively(client):
    client.post("/api/auth/signup", json=CREDS)
    r = client.post("/api/auth/signup", json={**CREDS, "email": "ADA@example.com"})
    assert r.status_code == 409


def test_signup_rejects_short_password(client):
    r = client.post("/api/auth/signup", json={**CREDS, "password": "short"})
    assert r.status_code == 422


def test_login_wrong_password_and_unknown_email_answer_the_same(client):
    client.post("/api/auth/signup", json=CREDS)
    client.cookies.clear()
    wrong = client.post("/api/auth/login", json={**CREDS, "password": "wrong password"})
    unknown = client.post("/api/auth/login", json={**CREDS, "email": "nobody@example.com"})
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json() == unknown.json()


def test_login_then_logout(client):
    client.post("/api/auth/signup", json=CREDS)
    client.cookies.clear()
    assert client.get("/api/auth/me").status_code == 401
    assert client.post("/api/auth/login", json=CREDS).status_code == 200
    assert client.get("/api/auth/me").status_code == 200
    assert client.post("/api/auth/logout").status_code == 200
    assert client.get("/api/auth/me").status_code == 401


def test_logout_retires_copies_of_the_cookie(client):
    client.post("/api/auth/signup", json=CREDS)
    stolen = client.cookies.get(COOKIE_NAME)
    client.post("/api/auth/logout")
    client.cookies.set(COOKIE_NAME, stolen)
    assert client.get("/api/auth/me").status_code == 401


def test_tampered_cookie_is_refused(client):
    client.post("/api/auth/signup", json=CREDS)
    token = client.cookies.get(COOKIE_NAME)
    client.cookies.set(COOKIE_NAME, token[:-2] + ("AA" if not token.endswith("AA") else "BB"))
    assert client.get("/api/auth/me").status_code == 401


def test_read_session_round_trip_and_garbage():
    import uuid

    uid = uuid.uuid4()
    assert read_session(create_session_token(uid, 3)) == (uid, 3)
    assert read_session("garbage") is None
    assert read_session(None) is None


def test_dev_secret_refused_outside_local(monkeypatch):
    import pytest

    from app.auth import resolve_session_secret

    monkeypatch.delenv("SESSION_SECRET", raising=False)
    monkeypatch.setenv("APP_ENV", "production")
    with pytest.raises(RuntimeError):
        resolve_session_secret()
    monkeypatch.setenv("APP_ENV", "local")
    monkeypatch.setenv("FRONTEND_URL", "https://app.example.com")
    with pytest.raises(RuntimeError):
        resolve_session_secret()
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("SESSION_SECRET", "short")
    with pytest.raises(RuntimeError):
        resolve_session_secret()
    monkeypatch.setenv("SESSION_SECRET", "x" * 32)
    assert resolve_session_secret() == "x" * 32
