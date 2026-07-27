import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.db.models import Report
from tests.factories import create_comment, create_reply, create_topic, create_user


@pytest.mark.asyncio
async def test_create_report_requires_login(client: AsyncClient):
    response = await client.post(
        "/reports",
        json={"target_type": "topic", "target_id": 1, "reason": "spam"},
    )

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_user_can_report_topic_with_snapshot(
    client: AsyncClient, db_session, set_auth_cookies
):
    owner = await create_user(db_session, username="topic-owner")
    reporter = await create_user(db_session, username="reporter")
    topic = await create_topic(
        db_session, user_id=owner.user_id, title="reported topic", description="snapshot body"
    )
    await db_session.commit()
    set_auth_cookies(client, reporter.user_id)

    response = await client.post(
        "/reports",
        json={"target_type": "topic", "target_id": topic.topic_id, "reason": "spam"},
    )

    assert response.status_code == 201
    assert response.json()["status"] == "pending"
    result = await db_session.execute(select(Report))
    report = result.scalar_one()
    assert report.reporter_user_id == reporter.user_id
    assert report.target_snapshot["author_id"] == owner.user_id
    assert report.target_snapshot["title"] == "reported topic"
    assert report.target_snapshot["content"] == "snapshot body"


@pytest.mark.asyncio
async def test_user_can_report_comment_and_reply(
    client: AsyncClient, db_session, set_auth_cookies
):
    owner = await create_user(db_session)
    reporter = await create_user(db_session)
    topic = await create_topic(db_session, user_id=owner.user_id)
    comment = await create_comment(
        db_session, user_id=owner.user_id, topic_id=topic.topic_id, content="bad comment"
    )
    reply = await create_reply(
        db_session, user_id=owner.user_id, comment_id=comment.comment_id, content="bad reply"
    )
    await db_session.commit()
    set_auth_cookies(client, reporter.user_id)

    comment_response = await client.post(
        "/reports",
        json={"target_type": "comment", "target_id": comment.comment_id, "reason": "abuse"},
    )
    reply_response = await client.post(
        "/reports",
        json={"target_type": "reply", "target_id": reply.reply_id, "reason": "hate"},
    )

    assert comment_response.status_code == 201
    assert reply_response.status_code == 201
    result = await db_session.execute(select(Report).order_by(Report.report_id))
    reports = list(result.scalars().all())
    assert reports[0].target_snapshot["content"] == "bad comment"
    assert reports[1].target_snapshot["content"] == "bad reply"
    assert reports[1].target_snapshot["topic_id"] == topic.topic_id


@pytest.mark.asyncio
async def test_user_cannot_report_own_content(
    client: AsyncClient, db_session, set_auth_cookies
):
    owner = await create_user(db_session)
    topic = await create_topic(db_session, user_id=owner.user_id)
    await db_session.commit()
    set_auth_cookies(client, owner.user_id)

    response = await client.post(
        "/reports",
        json={"target_type": "topic", "target_id": topic.topic_id, "reason": "spam"},
    )

    assert response.status_code == 400


@pytest.mark.asyncio
async def test_duplicate_report_returns_conflict(
    client: AsyncClient, db_session, set_auth_cookies
):
    owner = await create_user(db_session)
    reporter = await create_user(db_session)
    topic = await create_topic(db_session, user_id=owner.user_id)
    await db_session.commit()
    set_auth_cookies(client, reporter.user_id)
    payload = {"target_type": "topic", "target_id": topic.topic_id, "reason": "spam"}

    first_response = await client.post("/reports", json=payload)
    second_response = await client.post("/reports", json=payload)

    assert first_response.status_code == 201
    assert second_response.status_code == 409


@pytest.mark.asyncio
async def test_other_reason_requires_detail(
    client: AsyncClient, db_session, set_auth_cookies
):
    owner = await create_user(db_session)
    reporter = await create_user(db_session)
    topic = await create_topic(db_session, user_id=owner.user_id)
    await db_session.commit()
    set_auth_cookies(client, reporter.user_id)

    response = await client.post(
        "/reports",
        json={"target_type": "topic", "target_id": topic.topic_id, "reason": "other"},
    )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_missing_or_hidden_target_returns_not_found(
    client: AsyncClient, db_session, set_auth_cookies
):
    owner = await create_user(db_session)
    reporter = await create_user(db_session)
    topic = await create_topic(db_session, user_id=owner.user_id, is_hidden=True)
    await db_session.commit()
    set_auth_cookies(client, reporter.user_id)

    hidden_response = await client.post(
        "/reports",
        json={"target_type": "topic", "target_id": topic.topic_id, "reason": "spam"},
    )
    missing_response = await client.post(
        "/reports",
        json={"target_type": "reply", "target_id": 999999, "reason": "spam"},
    )

    assert hidden_response.status_code == 404
    assert missing_response.status_code == 404
