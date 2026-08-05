from __future__ import annotations

import asyncio
import threading
import time
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

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
