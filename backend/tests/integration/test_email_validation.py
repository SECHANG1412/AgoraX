from __future__ import annotations

import asyncio
import threading
import time
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.db.crud import UserCrud
from app.services.user import UserService


@pytest.mark.asyncio
async def test_email_validation_does_not_block_event_loop(monkeypatch):
    release_validation = threading.Event()

    def slow_validate_email(email: str, *, check_deliverability: bool):
        assert check_deliverability is True
        release_validation.wait(timeout=1)
        return SimpleNamespace(email=email)

    async def release_after_event_loop_turn():
        await asyncio.sleep(0.01)
        release_validation.set()

    monkeypatch.setattr("app.services.user.validate_email", slow_validate_email)

    release_task = asyncio.create_task(release_after_event_loop_turn())
    validated_email = await asyncio.wait_for(
        UserService._validate_email("user@example.com"),
        timeout=0.5,
    )
    await release_task

    assert validated_email == "user@example.com"


@pytest.mark.asyncio
async def test_email_validation_returns_service_unavailable_on_timeout(monkeypatch):
    def delayed_validate_email(email: str, *, check_deliverability: bool):
        assert check_deliverability is True
        time.sleep(0.1)
        return SimpleNamespace(email=email)

    monkeypatch.setattr("app.services.user.validate_email", delayed_validate_email)
    monkeypatch.setattr(
        "app.services.user.EMAIL_VALIDATION_TIMEOUT_SECONDS",
        0.01,
    )

    with pytest.raises(HTTPException) as exc_info:
        await UserService._validate_email("user@example.com")

    assert exc_info.value.status_code == 503
    assert exc_info.value.detail == (
        "이메일 확인 서비스 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요."
    )


@pytest.mark.asyncio
async def test_signup_uses_normalized_email_from_validation(
    client,
    db_session,
    monkeypatch,
):
    def normalize_email(email: str, *, check_deliverability: bool):
        assert check_deliverability is True
        return SimpleNamespace(email=email.lower())

    async def hash_password(password: str) -> str:
        return f"hashed::{password}"

    monkeypatch.setattr("app.services.user.validate_email", normalize_email)
    monkeypatch.setattr("app.services.user.get_password_hash", hash_password)

    response = await client.post(
        "/users/signup",
        json={
            "email": "Signup.User@Example.COM",
            "username": "signup-user",
            "password": "password123",
        },
    )

    assert response.status_code == 200
    assert response.json()["email"] == "signup.user@example.com"
    assert await UserCrud.get_by_email(db_session, "signup.user@example.com")


@pytest.mark.asyncio
async def test_profile_email_update_uses_normalized_email_from_validation(
    authenticated_client,
    db_session,
    auth_user,
    monkeypatch,
):
    def normalize_email(email: str, *, check_deliverability: bool):
        assert check_deliverability is True
        return SimpleNamespace(email=email.lower())

    monkeypatch.setattr("app.services.user.validate_email", normalize_email)

    response = await authenticated_client.put(
        "/users/me",
        json={"email": "Updated.User@Example.COM"},
    )

    assert response.status_code == 200
    assert response.json()["email"] == "updated.user@example.com"
    await db_session.refresh(auth_user)
    assert auth_user.email == "updated.user@example.com"
