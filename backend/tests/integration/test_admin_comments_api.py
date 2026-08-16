import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.db.models import AdminActionLog, Comment
from tests.factories import create_comment, create_topic, create_user


async def _set_admin_cookies(client: AsyncClient, db_session, set_auth_cookies):
    admin = await create_user(db_session, is_admin=True)
    await db_session.commit()
    set_auth_cookies(client, admin.user_id)
    return admin


@pytest.mark.asyncio
async def test_admin_comment_list_requires_login(client: AsyncClient):
    response = await client.get("/manage-api/comments")

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_admin_comment_list_rejects_regular_user(
    client: AsyncClient,
    db_session,
    set_auth_cookies,
):
    user = await create_user(db_session)
    await db_session.commit()
    set_auth_cookies(client, user.user_id)

    response = await client.get("/manage-api/comments")

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_admin_comment_list_includes_legacy_hidden_comments(
    client: AsyncClient,
    db_session,
    set_auth_cookies,
):
    owner = await create_user(db_session)
    topic = await create_topic(db_session, user_id=owner.user_id)
    await create_comment(
        db_session,
        user_id=owner.user_id,
        topic_id=topic.topic_id,
        content="public-comment",
    )
    await create_comment(
        db_session,
        user_id=owner.user_id,
        topic_id=topic.topic_id,
        content="hidden-comment",
        is_hidden=True,
    )
    await _set_admin_cookies(client, db_session, set_auth_cookies)

    response = await client.get("/manage-api/comments")

    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 2
    assert [item["content"] for item in payload["items"]] == [
        "hidden-comment",
        "public-comment",
    ]


@pytest.mark.asyncio
async def test_admin_can_delete_comment_and_record_snapshot_log(
    client: AsyncClient,
    db_session,
    set_auth_cookies,
):
    owner = await create_user(db_session, username="comment-author")
    topic = await create_topic(db_session, user_id=owner.user_id)
    comment = await create_comment(
        db_session,
        user_id=owner.user_id,
        topic_id=topic.topic_id,
        content="remove comment",
    )
    comment_id = comment.comment_id
    admin = await _set_admin_cookies(client, db_session, set_auth_cookies)

    response = await client.patch(
        f"/manage-api/comments/{comment_id}/delete",
        json={"reason": "abuse"},
    )

    assert response.status_code == 200
    assert response.json() == {"deleted": True}

    result = await db_session.execute(
        select(Comment).where(Comment.comment_id == comment_id)
    )
    deleted_comment = result.scalar_one_or_none()
    assert deleted_comment is None

    result = await db_session.execute(select(AdminActionLog))
    log = result.scalar_one()
    assert log.admin_user_id == admin.user_id
    assert log.action == "DELETE_COMMENT"
    assert log.target_type == "Comment"
    assert log.target_id == comment_id
    assert log.before_value["content"] == "remove comment"
    assert log.before_value["author_id"] == owner.user_id
    assert log.before_value["author_name"] == "comment-author"
    assert log.before_value["topic_id"] == topic.topic_id
    assert log.before_value["is_deleted"] is False
    assert log.after_value == {"deleted": True}
    assert log.reason == "abuse"


@pytest.mark.asyncio
async def test_delete_comment_requires_reason(
    client: AsyncClient,
    db_session,
    set_auth_cookies,
):
    owner = await create_user(db_session)
    topic = await create_topic(db_session, user_id=owner.user_id)
    comment = await create_comment(
        db_session,
        user_id=owner.user_id,
        topic_id=topic.topic_id,
    )
    await _set_admin_cookies(client, db_session, set_auth_cookies)

    response = await client.patch(
        f"/manage-api/comments/{comment.comment_id}/delete",
        json={"reason": "   "},
    )

    assert response.status_code == 422

    result = await db_session.execute(select(AdminActionLog))
    assert result.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_delete_missing_comment_returns_404(
    client: AsyncClient,
    db_session,
    set_auth_cookies,
):
    await _set_admin_cookies(client, db_session, set_auth_cookies)

    response = await client.patch(
        "/manage-api/comments/999999/delete",
        json={"reason": "missing comment"},
    )

    assert response.status_code == 404
