import pytest
from httpx import AsyncClient

from tests.factories import (
    create_comment,
    create_inquiry,
    create_topic,
    create_user,
)


async def _authenticate_admin(client, db_session, set_auth_cookies):
    admin = await create_user(db_session, is_admin=True)
    await db_session.commit()
    set_auth_cookies(client, admin.user_id)
    return admin


@pytest.mark.asyncio
async def test_admin_user_list_supports_search_and_pagination(
    client: AsyncClient, db_session, set_auth_cookies
):
    await create_user(db_session, username="alpha-user", email="alpha@example.com")
    await create_user(db_session, username="beta-user", email="beta@example.com")
    await _authenticate_admin(client, db_session, set_auth_cookies)

    searched = await client.get("/manage-api/users", params={"search": "ALPHA"})
    paged = await client.get(
        "/manage-api/users", params={"limit": 1, "offset": 1}
    )

    assert searched.status_code == 200
    assert searched.json()["total"] == 1
    assert searched.json()["items"][0]["username"] == "alpha-user"
    assert paged.status_code == 200
    assert paged.json()["total"] == 3
    assert len(paged.json()["items"]) == 1
    assert paged.json()["limit"] == 1
    assert paged.json()["offset"] == 1


@pytest.mark.asyncio
async def test_admin_topic_list_searches_title_and_description(
    client: AsyncClient, db_session, set_auth_cookies
):
    owner = await create_user(db_session)
    await create_topic(db_session, user_id=owner.user_id, title="ordinary topic")
    await create_topic(
        db_session,
        user_id=owner.user_id,
        title="matched title",
        description="unique-description",
    )
    await _authenticate_admin(client, db_session, set_auth_cookies)

    response = await client.get(
        "/manage-api/topics", params={"search": "unique-description"}
    )

    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert response.json()["items"][0]["title"] == "matched title"


@pytest.mark.asyncio
async def test_admin_comment_list_searches_content(
    client: AsyncClient, db_session, set_auth_cookies
):
    owner = await create_user(db_session)
    topic = await create_topic(db_session, user_id=owner.user_id)
    await create_comment(
        db_session,
        user_id=owner.user_id,
        topic_id=topic.topic_id,
        content="searchable comment",
    )
    await create_comment(
        db_session,
        user_id=owner.user_id,
        topic_id=topic.topic_id,
        content="unrelated",
    )
    await _authenticate_admin(client, db_session, set_auth_cookies)

    response = await client.get(
        "/manage-api/comments", params={"search": "SEARCHABLE"}
    )

    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert response.json()["items"][0]["content"] == "searchable comment"


@pytest.mark.asyncio
async def test_admin_inquiry_list_combines_search_and_status_filter(
    client: AsyncClient, db_session, set_auth_cookies
):
    await create_inquiry(
        db_session, title="matching inquiry", content="special keyword", status="pending"
    )
    await create_inquiry(
        db_session, title="resolved inquiry", content="special keyword", status="resolved"
    )
    await _authenticate_admin(client, db_session, set_auth_cookies)

    response = await client.get(
        "/manage-api/inquiries",
        params={"search": "special", "status": "resolved"},
    )

    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert response.json()["items"][0]["title"] == "resolved inquiry"


@pytest.mark.asyncio
async def test_admin_report_list_searches_reporter_name(
    client: AsyncClient, db_session, set_auth_cookies
):
    owner = await create_user(db_session)
    reporter = await create_user(db_session, username="searchable-reporter")
    topic = await create_topic(db_session, user_id=owner.user_id)
    admin = await create_user(db_session, is_admin=True)
    await db_session.commit()

    set_auth_cookies(client, reporter.user_id)
    created = await client.post(
        "/reports",
        json={"target_type": "topic", "target_id": topic.topic_id, "reason": "spam"},
    )
    assert created.status_code == 201
    set_auth_cookies(client, admin.user_id)

    response = await client.get(
        "/manage-api/reports", params={"search": "SEARCHABLE-REPORTER"}
    )

    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert response.json()["items"][0]["reporter_name"] == "searchable-reporter"
