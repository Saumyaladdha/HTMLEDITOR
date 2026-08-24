import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request, status

# --------------------------------------------------------------------------
# Minimal fixed-window-per-key rate limiter for the auth endpoints, which
# were previously unthrottled — /auth/login accepted unlimited password
# guesses at whatever rate a client could manage.
#
# Deliberately in-process and dependency-free: it is correct for the single
# uvicorn worker this app runs as today, and adding Redis for it would be a
# far bigger commitment than the problem currently warrants. The tradeoff is
# explicit — with N workers each gets its own allowance, so the effective
# limit is N x MAX_ATTEMPTS. Swap the storage here (not the call sites) for a
# shared store before running multi-worker in production.
# --------------------------------------------------------------------------

_WINDOW_SECONDS = 300  # 5 minutes
_MAX_ATTEMPTS = 10

_attempts: dict[str, deque[float]] = defaultdict(deque)


def _client_key(request: Request, scope: str) -> str:
    client = request.client.host if request.client else "unknown"
    return f"{scope}:{client}"


def enforce(request: Request, scope: str) -> None:
    """Raises 429 once a caller exceeds the window's allowance. Successful
    calls count too — this bounds total attempts from one source, so it can't
    be sidestepped by interleaving valid requests."""
    now = time.monotonic()
    bucket = _attempts[_client_key(request, scope)]

    while bucket and now - bucket[0] > _WINDOW_SECONDS:
        bucket.popleft()

    if len(bucket) >= _MAX_ATTEMPTS:
        retry_after = int(_WINDOW_SECONDS - (now - bucket[0])) + 1
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "Too many attempts. Please wait a few minutes and try again.",
            headers={"Retry-After": str(retry_after)},
        )

    bucket.append(now)


def reset(request: Request, scope: str) -> None:
    """Clears a caller's allowance after a genuine success, so someone who
    mistypes their password a few times and then gets in isn't left with a
    nearly-exhausted budget for the next five minutes."""
    _attempts.pop(_client_key(request, scope), None)
