from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Literal

from fastapi import Request
from fastapi.responses import JSONResponse
from jwt import InvalidTokenError
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

from app.core.jwt_handler import verify_token
from app.core.settings import settings
from app.metrics import rate_limit_blocked_total

logger = logging.getLogger(__name__)

Scope = Literal["ip", "user", "user_or_ip"]

INCREMENT_WITH_EXPIRY_SCRIPT = """
local current_count = redis.call("INCR", KEYS[1])
if current_count == 1 then
    redis.call("EXPIRE", KEYS[1], ARGV[1])
end
return current_count
"""


@dataclass(frozen=True)
class RateLimitPolicy:
    method: str
    path: str
    limit: int
    window_seconds: int
    scope: Scope
    exact: bool = True


RATE_LIMIT_POLICIES: tuple[RateLimitPolicy, ...] = (
    RateLimitPolicy("POST", "/users/login", limit=5, window_seconds=60, scope="ip"),
    RateLimitPolicy("POST", "/users/signup", limit=3, window_seconds=600, scope="ip"),
    RateLimitPolicy("POST", "/users/refresh", limit=20, window_seconds=60, scope="ip"),
    RateLimitPolicy("POST", "/topics", limit=10, window_seconds=60, scope="user"),
    RateLimitPolicy("POST", "/comments", limit=20, window_seconds=60, scope="user"),
    RateLimitPolicy("POST", "/replies", limit=20, window_seconds=60, scope="user"),
    RateLimitPolicy("POST", "/inquiries", limit=5, window_seconds=600, scope="user_or_ip"),
    RateLimitPolicy("POST", "/votes", limit=30, window_seconds=60, scope="user"),
    RateLimitPolicy("PUT", "/likes", limit=60, window_seconds=60, scope="user", exact=False),
)

EXCLUDED_PATH_PREFIXES = (
    "/docs",
    "/redoc",
    "/openapi.json",
    "/metrics",
    "/health",
)


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint):
        if not settings.rate_limit_enabled or self._is_excluded(request.url.path):
            return await call_next(request)

        policy = self._find_policy(request.method, request.url.path)
        if policy is None:
            return await call_next(request)

        redis_client = getattr(request.app.state, "redis_client", None)
        if redis_client is None:
            return await call_next(request)

        identity = self._resolve_identity(request, policy.scope)
        key = self._build_key(policy, identity)

        try:
            current_count = await redis_client.eval(
                INCREMENT_WITH_EXPIRY_SCRIPT,
                1,
                key,
                policy.window_seconds,
            )

            if current_count > policy.limit:
                retry_after = await self._retry_after(redis_client, key, policy.window_seconds)
                rate_limit_blocked_total.labels(
                    method=request.method,
                    path=policy.path,
                    scope=policy.scope,
                ).inc()
                return JSONResponse(
                    status_code=429,
                    content={
                        "detail": "Rate limit exceeded",
                        "retry_after": retry_after,
                    },
                    headers={"Retry-After": str(retry_after)},
                )
        except Exception:
            if settings.rate_limit_fail_open:
                logger.exception("rate limiting failed; allowing request")
                return await call_next(request)
            raise

        return await call_next(request)

    @staticmethod
    def _is_excluded(path: str) -> bool:
        return any(path == prefix or path.startswith(f"{prefix}/") for prefix in EXCLUDED_PATH_PREFIXES)

    @staticmethod
    def _find_policy(method: str, path: str) -> RateLimitPolicy | None:
        for policy in RATE_LIMIT_POLICIES:
            if policy.method != method:
                continue
            if policy.exact and path == policy.path:
                return policy
            if not policy.exact and (path == policy.path or path.startswith(f"{policy.path}/")):
                return policy
        return None

    @staticmethod
    def _resolve_identity(request: Request, scope: Scope) -> str:
        if scope in {"user", "user_or_ip"}:
            access_token = request.cookies.get("access_token")
            if access_token:
                try:
                    user_id = verify_token(access_token)
                    if user_id is not None:
                        return f"user:{user_id}"
                except InvalidTokenError:
                    pass

            if scope == "user":
                return "user:anonymous"

        return f"ip:{_client_ip(request)}"

    @staticmethod
    def _build_key(policy: RateLimitPolicy, identity: str) -> str:
        normalized_path = policy.path.strip("/").replace("/", ":") or "root"
        return f"rate_limit:{policy.method}:{normalized_path}:{identity}"

    @staticmethod
    async def _retry_after(redis_client, key: str, default_window: int) -> int:
        ttl = await redis_client.ttl(key)
        if ttl is None or ttl < 0:
            return default_window
        return int(ttl)


def _client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",", 1)[0].strip()
    if request.client:
        return request.client.host
    return "unknown"