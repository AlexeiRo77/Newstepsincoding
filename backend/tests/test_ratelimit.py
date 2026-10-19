from types import SimpleNamespace

from app.ratelimit import (
    LOGIN_FAILURES,
    LOGIN_FAILURES_PER_ADDRESS,
    SIGNUPS,
    SlidingWindowLimiter,
    client_key,
)

CREDS = {"email": "ada@example.com", "password": "correct horse"}
WRONG = {**CREDS, "password": "wrong password"}


def test_failed_logins_past_the_limit_get_429_before_any_password_check(client):
    client.post("/api/auth/signup", json=CREDS)
    for _ in range(LOGIN_FAILURES.limit):
        assert client.post("/api/auth/login", json=WRONG).status_code == 401
    r = client.post("/api/auth/login", json=WRONG)
    assert r.status_code == 429
    assert r.json() == {"detail": "too_many_attempts"}
    assert 0 < int(r.headers["Retry-After"]) <= LOGIN_FAILURES.window
    # Even the right password waits: the limit is checked before the account is looked up.
    assert client.post("/api/auth/login", json=CREDS).status_code == 429
    # An unknown email is limited the same way, so a 429 reveals nothing about which accounts exist.
    for _ in range(LOGIN_FAILURES.limit):
        client.post("/api/auth/login", json={**WRONG, "email": "nobody@example.com"})
    assert client.post("/api/auth/login", json={**WRONG, "email": "nobody@example.com"}).status_code == 429


def test_one_locked_email_does_not_lock_out_others_on_the_same_address(client):
    client.post("/api/auth/signup", json=CREDS)
    client.cookies.clear()
    for _ in range(LOGIN_FAILURES.limit + 1):
        client.post("/api/auth/login", json={**WRONG, "email": "typo@example.com"})
    assert client.post("/api/auth/login", json=CREDS).status_code == 200


def test_many_emails_from_one_address_hit_the_address_backstop(client):
    for i in range(LOGIN_FAILURES_PER_ADDRESS.limit):
        assert client.post("/api/auth/login", json={**WRONG, "email": f"u{i}@example.com"}).status_code == 401
    assert client.post("/api/auth/login", json={**WRONG, "email": "fresh@example.com"}).status_code == 429


def test_successful_logins_do_not_use_up_the_limit(client):
    client.post("/api/auth/signup", json=CREDS)
    for _ in range(LOGIN_FAILURES_PER_ADDRESS.limit + 1):
        assert client.post("/api/auth/login", json=CREDS).status_code == 200


def test_signups_past_the_limit_get_429(client):
    for i in range(SIGNUPS.limit):
        r = client.post("/api/auth/signup", json={**CREDS, "email": f"u{i}@example.com"})
        assert r.status_code == 201
    r = client.post("/api/auth/signup", json={**CREDS, "email": "one-more@example.com"})
    assert r.status_code == 429
    assert r.json() == {"detail": "too_many_attempts"}


def test_limiter_is_per_key_and_the_window_slides():
    now = [0.0]
    limiter = SlidingWindowLimiter(limit=2, window=60, clock=lambda: now[0])
    assert limiter.acquire("a") == 0
    now[0] = 30
    assert limiter.acquire("a") == 0
    assert limiter.acquire("a") == 30  # the first attempt leaves the window at t=60
    assert limiter.acquire("b") == 0  # another key is unaffected
    now[0] = 60
    assert limiter.acquire("a") == 0
    limiter.release("a")
    assert limiter.acquire("a") == 0
    assert limiter.acquire("a") > 0


def test_client_key_groups_an_ipv6_subscriber_by_its_64():
    def key(host):
        return client_key(SimpleNamespace(client=SimpleNamespace(host=host)))

    assert key("2001:db8:1:2::1") == key("2001:db8:1:2:ffff::9") == "2001:db8:1:2::/64"
    assert key("2001:db8:1:3::1") != key("2001:db8:1:2::1")
    assert key("203.0.113.7") == key("::ffff:203.0.113.7") == "203.0.113.7"
