"""End-to-end smoke test against a running stack: sign up, check the session, log out.

Not collected by pytest (no `test_` prefix); `./dc check full` runs it inside the backend container
against the frontend's dev server, so it exercises the proxy, the API and the real Postgres together.
Usage: python tests/smoke.py http://frontend:5173
"""

import http.cookiejar
import json
import sys
import urllib.error
import urllib.request
import uuid


def main(base: str) -> None:
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

    def call(method: str, path: str, body: dict | None = None) -> int:
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(base + path, data=data, method=method)
        if data is not None:
            req.add_header("Content-Type", "application/json")
        try:
            with opener.open(req, timeout=10) as res:
                return res.status
        except urllib.error.HTTPError as err:
            return err.code

    creds = {"email": f"smoke-{uuid.uuid4().hex[:8]}@example.com", "password": "smoke-test-password"}
    steps = [
        ("health", call("GET", "/api/health"), 200),
        ("signup", call("POST", "/api/auth/signup", creds), 201),
        ("me after signup", call("GET", "/api/auth/me"), 200),
        ("logout", call("POST", "/api/auth/logout"), 200),
        ("me after logout", call("GET", "/api/auth/me"), 401),
        ("login", call("POST", "/api/auth/login", creds), 200),
        ("me after login", call("GET", "/api/auth/me"), 200),
        ("page", call("GET", "/"), 200),
    ]
    failed = [f"{name}: got {got}, want {want}" for name, got, want in steps if got != want]
    for name, got, want in steps:
        print(f"{'ok  ' if got == want else 'FAIL'} {name} ({got})")
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main(sys.argv[1].rstrip("/"))
