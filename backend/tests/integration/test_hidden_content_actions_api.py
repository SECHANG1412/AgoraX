from __future__ import annotations

import pytest

from tests.factories import create_comment, create_reply, create_topic


@pytest.mark.asyncio
async def test_hidden_topic_blocks_user_activity(
    authenticated_client,
    db_session,
    auth_user,
):
    topic = await create_topic(
        db_session,
        user_id=auth_user.user_id,
        title="hidden-action-target",
        is_hidden=True,
    )
    comment = await create_comment(
        db_session,
        user_id=auth_user.user_id,
        topic_id=topic.topic_id,
        content="comment under hidden topic",
    )
    reply = await create_reply(
        db_session,
        user_id=auth_user.user_id,
        comment_id=comment.comment_id,
        content="reply under hidden topic",
    )
    await db_session.commit()

    responses = [
        await authenticated_client.get(f"/topics/{topic.topic_id}"),
        await authenticated_client.get(f"/comments/by-topic/{topic.topic_id}"),
        await authenticated_client.get(
            f"/votes/topic/{topic.topic_id}", params={"time_range": "all"}
        ),
        await authenticated_client.post(
            "/votes", json={"topic_id": topic.topic_id, "vote_index": 0}
        ),
        await authenticated_client.post(
            "/comments", json={"topic_id": topic.topic_id, "content": "blocked"}
        ),
        await authenticated_client.post(
            "/replies", json={"comment_id": comment.comment_id, "content": "blocked"}
        ),
        await authenticated_client.put(f"/likes/topic/{topic.topic_id}"),
        await authenticated_client.put(f"/likes/comment/{comment.comment_id}"),
        await authenticated_client.put(f"/likes/reply/{reply.reply_id}"),
    ]

    assert all(response.status_code == 404 for response in responses)


@pytest.mark.asyncio
async def test_hidden_comment_blocks_replies_and_likes(
    authenticated_client,
    db_session,
    auth_user,
):
    topic = await create_topic(
        db_session,
        user_id=auth_user.user_id,
        title="hidden-comment-action-target",
    )
    comment = await create_comment(
        db_session,
        user_id=auth_user.user_id,
        topic_id=topic.topic_id,
        content="hidden comment",
        is_hidden=True,
    )
    reply = await create_reply(
        db_session,
        user_id=auth_user.user_id,
        comment_id=comment.comment_id,
        content="reply under hidden comment",
    )
    await db_session.commit()

    responses = [
        await authenticated_client.post(
            "/replies", json={"comment_id": comment.comment_id, "content": "blocked"}
        ),
        await authenticated_client.put(f"/likes/comment/{comment.comment_id}"),
        await authenticated_client.put(f"/likes/reply/{reply.reply_id}"),
    ]

    assert all(response.status_code == 404 for response in responses)