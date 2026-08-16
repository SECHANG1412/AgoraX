import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.db.models import AdminActionLog, Topic
from tests.factories import create_topic, create_user


async def _set_admin_cookies(client: AsyncClient, db_session, set_auth_cookies):
    admin = await create_user(db_session, is_admin=True)
    await db_session.commit()
    set_auth_cookies(client, admin.user_id)
    return admin


@pytest.mark.asyncio
async def test_admin_topic_list_requires_login(client: AsyncClient):
    response = await client.get("/manage-api/topics")

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_admin_topic_list_rejects_regular_user(
    client: AsyncClient,
    db_session,
    set_auth_cookies,
):
    user = await create_user(db_session)
    await db_session.commit()
    set_auth_cookies(client, user.user_id)

    response = await client.get("/manage-api/topics")

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_admin_topic_list_includes_legacy_hidden_topics(
    client: AsyncClient,
    db_session,
    set_auth_cookies,
):
    owner = await create_user(db_session)
    await create_topic(db_session, user_id=owner.user_id, title="public-topic")
    await create_topic(
        db_session,
        user_id=owner.user_id,
        title="hidden-topic",
        is_hidden=True,
    )
    await _set_admin_cookies(client, db_session, set_auth_cookies)

    response = await client.get("/manage-api/topics")

    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 2
    assert [item["title"] for item in payload["items"]] == ["hidden-topic", "public-topic"]


@pytest.mark.asyncio
async def test_admin_can_delete_topic_and_record_snapshot_log(
    client: AsyncClient,
    db_session,
    set_auth_cookies,
):
    owner = await create_user(db_session, username="topic-author")
    topic = await create_topic(
        db_session,
        user_id=owner.user_id,
        title="remove topic",
        description="remove desc",
        category="general",
        vote_options=["yes", "no"],
    )
    topic_id = topic.topic_id
    admin = await _set_admin_cookies(client, db_session, set_auth_cookies)

    response = await client.patch(
        f"/manage-api/topics/{topic_id}/delete",
        json={"reason": "spam"},
    )

    assert response.status_code == 200
    assert response.json() == {"deleted": True}

    result = await db_session.execute(
        select(Topic).where(Topic.topic_id == topic_id)
    )
    deleted_topic = result.scalar_one_or_none()
    assert deleted_topic is None

    result = await db_session.execute(select(AdminActionLog))
    log = result.scalar_one()
    assert log.admin_user_id == admin.user_id
    assert log.action == "DELETE_TOPIC"
    assert log.target_type == "Topic"
    assert log.target_id == topic_id
    assert log.before_value["title"] == "remove topic"
    assert log.before_value["description"] == "remove desc"
    assert log.before_value["category"] == "general"
    assert log.before_value["vote_options"] == ["yes", "no"]
    assert log.before_value["author_id"] == owner.user_id
    assert log.before_value["author_name"] == "topic-author"
    assert log.after_value == {"deleted": True}
    assert log.reason == "spam"


@pytest.mark.asyncio
async def test_delete_topic_requires_reason(
    client: AsyncClient,
    db_session,
    set_auth_cookies,
):
    owner = await create_user(db_session)
    topic = await create_topic(db_session, user_id=owner.user_id)
    await _set_admin_cookies(client, db_session, set_auth_cookies)

    response = await client.patch(
        f"/manage-api/topics/{topic.topic_id}/delete",
        json={"reason": "   "},
    )

    assert response.status_code == 422

    result = await db_session.execute(select(AdminActionLog))
    assert result.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_delete_missing_topic_returns_404(
    client: AsyncClient,
    db_session,
    set_auth_cookies,
):
    await _set_admin_cookies(client, db_session, set_auth_cookies)

    response = await client.patch(
        "/manage-api/topics/999999/delete",
        json={"reason": "missing topic"},
    )

    assert response.status_code == 404
