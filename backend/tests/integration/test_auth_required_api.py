from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient

from app.core.jwt_handler import create_refresh_token
from app.db.crud import UserCrud
from tests.factories import create_comment, create_topic, create_user


@pytest.mark.asyncio
async def test_auth_required_endpoints_return_401_without_cookie(client: AsyncClient, db_session, auth_user):
    topic = await create_topic(db_session, user_id=auth_user.user_id, vote_options=["A", "B"])
    await db_session.commit()

    post_topic = await client.post(
        "/topics",
        json={
            "title": "new-topic",
            "category": "general",
            "description": "desc",
            "vote_options": ["A", "B"],
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        },
    )
    post_vote = await client.post("/votes", json={"topic_id": topic.topic_id, "vote_index": 0})
    put_like = await client.put(f"/likes/topic/{topic.topic_id}")

    assert post_topic.status_code == 401
    assert post_vote.status_code == 401
    assert put_like.status_code == 401


@pytest.mark.asyncio
async def test_forbidden_delete_topic_returns_403(client: AsyncClient, db_session, set_auth_cookies):
    owner = await create_user(db_session, username="owner_user", email="owner@example.com")
    attacker = await create_user(db_session, username="attacker_user", email="attacker@example.com")
    topic = await create_topic(db_session, user_id=owner.user_id, title="forbidden-delete")
    await db_session.commit()

    set_auth_cookies(client, attacker.user_id)
    response = await client.delete(f"/topics/{topic.topic_id}")
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_update_me_hashes_password_before_saving(
    authenticated_client: AsyncClient,
    db_session,
    auth_user,
    monkeypatch,
):
    async def fake_get_password_hash(password: str) -> str:
        return f"hashed::{password}"

    monkeypatch.setattr("app.services.user.get_password_hash", fake_get_password_hash)

    response = await authenticated_client.put(
        "/users/me",
        json={"password": "new-plain-password"},
    )

    assert response.status_code == 200

    await db_session.refresh(auth_user)
    db_user = await UserCrud.get_by_id(db_session, auth_user.user_id)
    assert db_user is not None
    assert db_user.password == "hashed::new-plain-password"


@pytest.mark.asyncio
async def test_password_change_invalidates_existing_session(
    authenticated_client: AsyncClient,
    db_session,
    auth_user,
    monkeypatch,
):
    previous_refresh_token = create_refresh_token(auth_user.user_id)

    async def fake_get_password_hash(password: str) -> str:
        return f"hashed::{password}"

    monkeypatch.setattr("app.services.user.get_password_hash", fake_get_password_hash)

    await UserCrud.update_refresh_token_by_id(
        db_session, auth_user.user_id, previous_refresh_token
    )
    await db_session.commit()
    authenticated_client.cookies.set("refresh_token", previous_refresh_token)

    response = await authenticated_client.put(
        "/users/me",
        json={"password": "new-secure-password"},
    )

    assert response.status_code == 200
    await db_session.refresh(auth_user)
    assert auth_user.refresh_token is None

    set_cookie_headers = response.headers.get_list("set-cookie")
    for cookie_name in ("access_token", "refresh_token", "csrf_token"):
        assert any(
            header.startswith(f"{cookie_name}=") and "Max-Age=0" in header
            for header in set_cookie_headers
        )

    authenticated_client.cookies.set("refresh_token", previous_refresh_token)
    authenticated_client.cookies.set("csrf_token", "test-csrf-token")
    refresh_response = await authenticated_client.post("/users/refresh")

    assert refresh_response.status_code == 401
    assert refresh_response.json()["detail"] == "Invalid refresh token"


@pytest.mark.asyncio
async def test_profile_change_without_password_preserves_session(
    authenticated_client: AsyncClient,
    db_session,
    auth_user,
):
    refresh_token = create_refresh_token(auth_user.user_id)
    await UserCrud.update_refresh_token_by_id(db_session, auth_user.user_id, refresh_token)
    await db_session.commit()

    response = await authenticated_client.put(
        "/users/me", json={"username": "updated-user"}
    )

    assert response.status_code == 200
    await db_session.refresh(auth_user)
    assert auth_user.refresh_token == refresh_token
    assert response.headers.get_list("set-cookie") == []


@pytest.mark.asyncio
async def test_update_me_rejects_duplicate_username_with_case_and_spaces(
    authenticated_client: AsyncClient,
    db_session,
):
    await create_user(db_session, username="TakenName", email="taken@example.com")
    await db_session.commit()

    response = await authenticated_client.put(
        "/users/me",
        json={"username": "  takenname  "},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "이미 사용 중인 이름입니다."


@pytest.mark.asyncio
async def test_update_me_allows_own_username_with_extra_spaces(
    authenticated_client: AsyncClient,
    db_session,
    auth_user,
):
    updated_username = auth_user.username.upper()

    response = await authenticated_client.put(
        "/users/me",
        json={"username": f"  {updated_username}  "},
    )

    assert response.status_code == 200

    await db_session.refresh(auth_user)
    assert auth_user.username == updated_username
    assert auth_user.username_normalized == updated_username.casefold()


@pytest.mark.asyncio
async def test_user_activity_includes_topic_id_and_latest_first(
    authenticated_client: AsyncClient,
    db_session,
    auth_user,
):
    base_time = datetime.now(timezone.utc) - timedelta(hours=1)
    older_topic = await create_topic(
        db_session,
        user_id=auth_user.user_id,
        title="older-topic",
        created_at=base_time,
    )
    latest_topic = await create_topic(
        db_session,
        user_id=auth_user.user_id,
        title="latest-topic",
        created_at=base_time + timedelta(minutes=1),
    )
    await db_session.commit()

    response = await authenticated_client.get("/users/activity")

    assert response.status_code == 200
    payload = response.json()
    assert [item["topic_id"] for item in payload] == [
        latest_topic.topic_id,
        older_topic.topic_id,
    ]
    assert payload[0]["title"] == "latest-topic"
    assert payload[0]["type"] == "topic"


@pytest.mark.asyncio
async def test_content_status_requires_login(client: AsyncClient):
    response = await client.get("/users/content-status")

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_content_status_returns_only_my_hidden_topics_and_comments(
    authenticated_client: AsyncClient,
    db_session,
    auth_user,
):
    other_user = await create_user(db_session)
    hidden_at = datetime.now(timezone.utc)
    hidden_topic = await create_topic(
        db_session,
        user_id=auth_user.user_id,
        title="hidden-topic",
        description="hidden-topic-description",
        is_hidden=True,
        hidden_at=hidden_at,
    )
    visible_topic = await create_topic(
        db_session,
        user_id=auth_user.user_id,
        title="visible-topic",
    )
    other_hidden_topic = await create_topic(
        db_session,
        user_id=other_user.user_id,
        title="other-hidden-topic",
        is_hidden=True,
        hidden_at=hidden_at,
    )
    hidden_comment = await create_comment(
        db_session,
        user_id=auth_user.user_id,
        topic_id=visible_topic.topic_id,
        content="hidden-comment",
        is_hidden=True,
        hidden_at=hidden_at + timedelta(minutes=1),
    )
    await create_comment(
        db_session,
        user_id=auth_user.user_id,
        topic_id=visible_topic.topic_id,
        content="visible-comment",
    )
    await create_comment(
        db_session,
        user_id=other_user.user_id,
        topic_id=other_hidden_topic.topic_id,
        content="other-hidden-comment",
        is_hidden=True,
        hidden_at=hidden_at,
    )
    await db_session.commit()

    response = await authenticated_client.get("/users/content-status")

    assert response.status_code == 200
    payload = response.json()
    assert [item["type"] for item in payload] == ["comment", "topic"]
    assert [item["item_id"] for item in payload] == [
        hidden_comment.comment_id,
        hidden_topic.topic_id,
    ]
    assert payload[0]["title"] == "visible-topic"
    assert payload[0]["content"] == "hidden-comment"
    assert payload[1]["title"] == "hidden-topic"
    assert payload[1]["content"] == "hidden-topic-description"
