from __future__ import annotations

import pytest
from httpx import AsyncClient

from tests.factories import create_user


async def _set_admin_cookies(client: AsyncClient, db_session, set_auth_cookies):
    admin = await create_user(
        db_session,
        username="admin_user",
        email="admin@example.com",
        is_admin=True,
    )
    await db_session.commit()
    set_auth_cookies(client, admin.user_id)
    return admin


@pytest.mark.asyncio
async def test_admin_users_requires_login(client: AsyncClient):
    response = await client.get("/manage-api/users")

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_admin_users_rejects_regular_user(
    client: AsyncClient,
    db_session,
    set_auth_cookies,
):
    user = await create_user(db_session)
    await db_session.commit()
    set_auth_cookies(client, user.user_id)

    response = await client.get("/manage-api/users")

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_admin_can_list_users(client: AsyncClient, db_session, set_auth_cookies):
    admin = await _set_admin_cookies(client, db_session, set_auth_cookies)
    regular_user = await create_user(
        db_session,
        username="regular_user",
        email="regular@example.com",
    )
    await db_session.commit()

    response = await client.get("/manage-api/users")

    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 2
    assert payload["limit"] == 20
    assert payload["offset"] == 0
    users_by_id = {item["user_id"]: item for item in payload["items"]}

    assert admin.user_id in users_by_id
    assert regular_user.user_id in users_by_id
    assert users_by_id[admin.user_id]["is_admin"] is True
    assert users_by_id[regular_user.user_id]["is_admin"] is False
    assert users_by_id[regular_user.user_id]["email"] == "regular@example.com"
    assert users_by_id[regular_user.user_id]["username"] == "regular_user"


@pytest.mark.asyncio
async def test_admin_users_limit_validation(
    client: AsyncClient,
    db_session,
    set_auth_cookies,
):
    await _set_admin_cookies(client, db_session, set_auth_cookies)

    response = await client.get("/manage-api/users", params={"limit": 0})

    assert response.status_code == 422
