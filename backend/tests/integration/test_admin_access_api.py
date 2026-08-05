import pytest
from httpx import AsyncClient

from app.db.crud import UserCrud
from tests.factories import create_user


@pytest.mark.asyncio
async def test_admin_api_returns_401_without_login(client: AsyncClient):
    response = await client.get("/manage-api/me")

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_admin_api_returns_403_for_regular_user(
    client: AsyncClient,
    db_session,
    set_auth_cookies,
):
    user = await create_user(db_session)
    await db_session.commit()
    set_auth_cookies(client, user.user_id)

    response = await client.get("/manage-api/me")

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_admin_api_allows_admin_user(
    client: AsyncClient,
    db_session,
    set_auth_cookies,
):
    admin = await create_user(db_session, is_admin=True)
    await db_session.commit()
    set_auth_cookies(client, admin.user_id)

    response = await client.get("/manage-api/me")

    assert response.status_code == 200
    assert response.json() == {"user_id": admin.user_id, "is_admin": True}


@pytest.mark.asyncio
async def test_signup_creates_regular_user(client: AsyncClient, db_session, monkeypatch):
    async def fake_hash_password(password: str) -> str:
        return f"hashed::{password}"

    async def fake_validate_email(email: str) -> str:
        return email

    monkeypatch.setattr("app.services.user.get_password_hash", fake_hash_password)
    monkeypatch.setattr(
        "app.services.user.UserService._validate_email",
        staticmethod(fake_validate_email),
    )

    response = await client.post(
        "/users/signup",
        json={
            "email": "new-user@example.com",
            "username": "new-user",
            "password": "password123",
            "is_admin": True,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["is_admin"] is False

    db_user = await UserCrud.get_by_email(db_session, "new-user@example.com")
    assert db_user is not None
    assert db_user.is_admin is False
    assert db_user.username_normalized == "new-user"


@pytest.mark.asyncio
async def test_signup_rejects_duplicate_username_with_case_and_spaces(
    client: AsyncClient,
    db_session,
    monkeypatch,
):
    async def fake_hash_password(password: str) -> str:
        return f"hashed::{password}"

    async def fake_validate_email(email: str) -> str:
        return email

    await create_user(db_session, username="TakenName", email="taken@example.com")
    await db_session.commit()

    monkeypatch.setattr("app.services.user.get_password_hash", fake_hash_password)
    monkeypatch.setattr(
        "app.services.user.UserService._validate_email",
        staticmethod(fake_validate_email),
    )

    response = await client.post(
        "/users/signup",
        json={
            "email": "new-user@example.com",
            "username": "  takenname  ",
            "password": "password123",
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "이미 사용 중인 이름입니다."


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "payload",
    [
        {
            "email": "not-an-email",
            "username": "valid-user",
            "password": "password123",
        },
        {
            "email": "valid@example.com",
            "username": " ",
            "password": "password123",
        },
        {
            "email": "valid@example.com",
            "username": "valid-user",
            "password": "12345",
        },
        {
            "email": "valid@example.com",
            "username": "valid-user",
            "password": "   ",
        },
    ],
)
async def test_signup_rejects_invalid_input(client: AsyncClient, payload):
    response = await client.post("/users/signup", json=payload)

    assert response.status_code == 422
