"""Per-client rate limits for the costly auth endpoints (each attempt is a bcrypt hash).

In-process and in-memory: the API runs as a single uvicorn worker, so one process sees every request.
The client address is `request.client.host`, which behind Caddy is the real one (uvicorn's
`--proxy-headers`; Caddy replaces any X-Forwarded-For a client sends). Thresholds are the constants below;
docs/codebase.md#login-and-sessions describes them.
"""

from __future__ import annotations

import ipaddress
import math
import threading
import time
from collections import OrderedDict, deque

from fastapi import HTTPException, Request

MAX_KEYS = 100_000  # memory bound: past it the least recently active key is forgotten


class SlidingWindowLimiter:
    """At most `limit` recorded events per key within any `window` seconds."""

    def __init__(self, limit: int, window: float, clock=time.monotonic):
        self.limit = limit
        self.window = window
        self._clock = clock
        self._events: OrderedDict[str, deque[float]] = OrderedDict()
        self._lock = threading.Lock()

    def acquire(self, key: str) -> int:
        """Count one attempt for `key` and return 0, or — over the limit — count nothing and return the
        seconds until it may try again. Check and count are one step, so a burst cannot slip past."""
        with self._lock:
            now = self._clock()
            events = self._events.setdefault(key, deque())
            self._events.move_to_end(key)
            while events and events[0] <= now - self.window:
                events.popleft()
            if len(events) >= self.limit:
                return max(1, math.ceil(events[0] + self.window - now))
            events.append(now)
            if len(self._events) > MAX_KEYS:
                self._events.popitem(last=False)
            return 0

    def release(self, key: str) -> None:
        """Uncount the latest attempt for `key` (it turned out not to count, e.g. a successful login)."""
        with self._lock:
            events = self._events.get(key)
            if events:
                events.pop()

    def reset(self) -> None:
        with self._lock:
            self._events.clear()


# Failed logins (wrong password or unknown email alike) per address and email, so one person's typos do
# not lock out others behind the same address; and per address alone, a backstop against trying many
# emails. A successful login is released from both.
LOGIN_FAILURES = SlidingWindowLimiter(limit=10, window=5 * 60)
LOGIN_FAILURES_PER_ADDRESS = SlidingWindowLimiter(limit=50, window=5 * 60)
# Sign-up attempts that reach the password hash, per address: well above a class behind one address.
SIGNUPS = SlidingWindowLimiter(limit=60, window=60 * 60)


def client_key(request: Request) -> str:
    """The client address; an IPv6 client is keyed by its /64, which one subscriber usually holds whole."""
    host = request.client.host if request.client else "unknown"
    try:
        ip = ipaddress.ip_address(host)
    except ValueError:
        return host
    if ip.version == 4:
        return str(ip)
    if ip.ipv4_mapped is not None:
        return str(ip.ipv4_mapped)
    return str(ipaddress.ip_network(f"{ip}/64", strict=False))


def too_many(wait: int) -> HTTPException:
    return HTTPException(status_code=429, detail="too_many_attempts", headers={"Retry-After": str(wait)})


def enforce(limiter: SlidingWindowLimiter, key: str) -> None:
    """Count this attempt, or answer 429 (with Retry-After) before any password work once over the limit."""
    wait = limiter.acquire(key)
    if wait:
        raise too_many(wait)
