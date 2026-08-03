from __future__ import annotations

import asyncio
import os
from pathlib import Path
from typing import AsyncIterator

import pytest
from asgi_lifespan import LifespanManager
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Required by app.core.settings at import time.
os.environ.setdefault("DB_USER", "test")
os.environ.setdefault("DB_PASSWORD", "test")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "3306")
os.environ.setdefault("DB_NAME", "test")
os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault("JWT_ALGORITHM", "HS256")
os.environ.setdefault("ACCESS_TOKEN_EXPIRE", "900")
os.environ.setdefault("REFRESH_TOKEN_EXPIRE", "604800")
os.environ.setdefault("PERFORMANCE_DEBUG_ENABLED", "true")

from app.core.jwt_handler import create_access_token, create_refresh_token
from app.db import models  # noqa: F401 - register models to Base metadata
from app.db.database import Base, get_db
from app.perf import register_async_engine_perf_hooks
from main import app
from tests.factories import create_user

TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL")


def _sqlite_path_from_url(database_url: str) -> Path | None:
    sqlite_prefix = "sqlite+aiosqlite:///"
    if not database_url.startswith(sqlite_prefix) or database_url.endswith(":memory:"):
        return None
    return Path(database_url.removeprefix(sqlite_prefix))


@pytest.fixture(scope="session")
def test_database_url(tmp_path_factory: pytest.TempPathFactory) -> str:
    if TEST_DATABASE_URL:
        return TEST_DATABASE_URL

    db_dir = tmp_path_factory.mktemp("integration-db")
    db_path = db_dir / "test_integration.db"
    return f"sqlite+aiosqlite:///{db_path.as_posix()}"


@pytest.fixture(scope="session")
def test_db_path(test_database_url: str) -> Path | None:
    return _sqlite_path_from_url(test_database_url)


@pytest.fixture(scope="session")
def test_engine(test_database_url: str):
    connect_args = {"check_same_thread": False} if test_database_url.startswith("sqlite") else {}
    engine = create_async_engine(test_database_url, future=True, connect_args=connect_args)
    register_async_engine_perf_hooks(engine)
    return engine


@pytest.fixture(scope="session")
def async_session_maker(test_engine):
    return async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)


@pytest.fixture(scope="session", autouse=True)
async def setup_test_schema(test_engine, test_db_path: Path | None):
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await test_engine.dispose()
    if test_db_path and test_db_path.exists():
        for _ in range(5):
            try:
                test_db_path.unlink()
                break
            except PermissionError:
                await asyncio.sleep(0.1)


@pytest.fixture(scope="session", autouse=True)
def override_db_dependency(async_session_maker):
    async def _get_test_db() -> AsyncIterator[AsyncSession]:
        async with async_session_maker() as session:
            yield session

    app.dependency_overrides[get_db] = _get_test_db
    yield
    app.dependency_overrides.pop(get_db, None)


@pytest.fixture(autouse=True)
async def clean_db(async_session_maker):
    async with async_session_maker() as session:
        for table in reversed(Base.metadata.sorted_tables):
            await session.execute(delete(table))
        await session.commit()
    yield


@pytest.fixture
async def db_session(async_session_maker) -> AsyncIterator[AsyncSession]:
    async with async_session_maker() as session:
        yield session


@pytest.fixture
async def client() -> AsyncIterator[AsyncClient]:
    async with LifespanManager(app):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://testserver") as async_client:
            yield async_client


@pytest.fixture
def set_auth_cookies():
    def _set(client: AsyncClient, user_id: int):
        client.cookies.set("access_token", create_access_token(user_id))
        client.cookies.set("refresh_token", create_refresh_token(user_id))
        client.cookies.set("csrf_token", "test-csrf-token")
        client.headers["X-CSRF-Token"] = "test-csrf-token"

    return _set


@pytest.fixture
async def auth_user(db_session: AsyncSession):
    user = await create_user(db_session, username="auth_user", email="auth_user@example.com")
    await db_session.commit()
    return user


@pytest.fixture
async def authenticated_client(client: AsyncClient, auth_user, set_auth_cookies):
    set_auth_cookies(client, auth_user.user_id)
    return client
