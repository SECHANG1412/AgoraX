from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient

from app.core.settings import settings
from main import app


class FakeRedis:
    def __init__(self):
        self.values: dict[str, int] = {}
        self.ttls: dict[str, int] = {}
        self.eval_calls: list[tuple[str, int, str, int]] = []

    async def eval(self, script: str, numkeys: int, key: str, seconds: int) -> int:
        self.eval_calls.append((script, numkeys, key, seconds))
        self.values[key] = self.values.get(key, 0) + 1
        if self.values[key] == 1:
            self.ttls[key] = seconds
        return self.values[key]

    async def ttl(self, key: str) -> int:
        return self.ttls.get(key, -1)


@pytest.fixture(autouse=True)
def reset_rate_limit_state():
    previous_enabled = settings.rate_limit_enabled
    previous_fail_open = settings.rate_limit_fail_open
    previous_client = getattr(app.state, "redis_client", None)
    settings.rate_limit_enabled = True
    yield
    settings.rate_limit_enabled = previous_enabled
    settings.rate_limit_fail_open = previous_fail_open
    app.state.redis_client = previous_client


@pytest.mark.asyncio
async def test_login_rate_limit_returns_429_after_limit(client: AsyncClient):
    fake_redis = FakeRedis()
    app.state.redis_client = fake_redis
    payload = {"email": "missing@example.com", "password": "wrong-password"}

    for _ in range(5):
        response = await client.post("/users/login", json=payload)
        assert response.status_code != 429

    response = await client.post("/users/login", json=payload)

    assert response.status_code == 429
    assert response.json()["detail"] == "Rate limit exceeded"
    assert response.headers["Retry-After"] == "60"
    key = next(iter(fake_redis.values))
    assert key.startswith("rate_limit:POST:users:login:ip:")
    assert fake_redis.values[key] == 6
    assert fake_redis.ttls[key] == 60
    assert len(fake_redis.eval_calls) == 6
    assert all(call[1:] == (1, key, 60) for call in fake_redis.eval_calls)


@pytest.mark.asyncio
async def test_topic_create_rate_limit_uses_authenticated_user(
    authenticated_client: AsyncClient,
):
    app.state.redis_client = FakeRedis()
    expires_at = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()

    for index in range(10):
        response = await authenticated_client.post(
            "/topics",
            json={
                "title": f"rate-limit-topic-{index}",
                "category": "general",
                "vote_options": ["A", "B"],
                "description": "rate limit test",
                "expires_at": expires_at,
            },
        )
        assert response.status_code != 429

    response = await authenticated_client.post(
        "/topics",
        json={
            "title": "rate-limit-topic-blocked",
            "category": "general",
            "vote_options": ["A", "B"],
            "description": "rate limit test",
            "expires_at": expires_at,
        },
    )

    assert response.status_code == 429
    assert response.json()["retry_after"] == 60


@pytest.mark.asyncio
async def test_health_endpoint_is_excluded_from_rate_limit(client: AsyncClient):
    fake_redis = FakeRedis()
    app.state.redis_client = fake_redis

    for _ in range(10):
        response = await client.get("/health")
        assert response.status_code == 200

    assert fake_redis.values == {}


@pytest.mark.asyncio
async def test_rate_limit_script_failure_fails_open(client: AsyncClient):
    class FailingRedis(FakeRedis):
        async def eval(self, script: str, numkeys: int, key: str, seconds: int) -> int:
            raise ConnectionError("redis unavailable")

    settings.rate_limit_fail_open = True
    app.state.redis_client = FailingRedis()

    response = await client.post(
        "/users/login",
        json={"email": "missing@example.com", "password": "wrong-password"},
    )

    assert response.status_code != 429
