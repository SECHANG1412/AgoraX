from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from app.db.schemas.content_limits import (
    COMMENT_CONTENT_MAX_LENGTH,
    REPLY_CONTENT_MAX_LENGTH,
    TOPIC_CATEGORY_MAX_LENGTH,
    TOPIC_DESCRIPTION_MAX_LENGTH,
    TOPIC_OPTION_MAX_LENGTH,
    TOPIC_TITLE_MAX_LENGTH,
)
from tests.factories import create_comment, create_topic


def future_expiration() -> str:
    return (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()


@pytest.mark.asyncio
async def test_comment_content_length_and_blank_boundaries(
    authenticated_client,
    db_session,
    auth_user,
):
    topic = await create_topic(db_session, user_id=auth_user.user_id)
    await db_session.commit()

    accepted = await authenticated_client.post(
        '/comments',
        json={'topic_id': topic.topic_id, 'content': f" {'a' * (COMMENT_CONTENT_MAX_LENGTH - 2)} "},
    )
    assert accepted.status_code == 200
    assert accepted.json()['content'] == 'a' * (COMMENT_CONTENT_MAX_LENGTH - 2)

    comment_id = accepted.json()['comment_id']
    for content in (' ', 'a' * (COMMENT_CONTENT_MAX_LENGTH + 1)):
        created = await authenticated_client.post(
            '/comments',
            json={'topic_id': topic.topic_id, 'content': content},
        )
        updated = await authenticated_client.put(
            f'/comments/{comment_id}',
            json={'content': content},
        )

        assert created.status_code == 422
        assert updated.status_code == 422


@pytest.mark.asyncio
async def test_reply_content_length_and_blank_boundaries(
    authenticated_client,
    db_session,
    auth_user,
):
    topic = await create_topic(db_session, user_id=auth_user.user_id)
    comment = await create_comment(
        db_session,
        user_id=auth_user.user_id,
        topic_id=topic.topic_id,
    )
    await db_session.commit()

    accepted = await authenticated_client.post(
        '/replies',
        json={
            'comment_id': comment.comment_id,
            'content': f" {'a' * (REPLY_CONTENT_MAX_LENGTH - 2)} ",
        },
    )
    assert accepted.status_code == 200
    assert accepted.json()['content'] == 'a' * (REPLY_CONTENT_MAX_LENGTH - 2)

    reply_id = accepted.json()['reply_id']
    for content in (' ', 'a' * (REPLY_CONTENT_MAX_LENGTH + 1)):
        created = await authenticated_client.post(
            '/replies',
            json={'comment_id': comment.comment_id, 'content': content},
        )
        updated = await authenticated_client.put(
            f'/replies/{reply_id}',
            json={'content': content},
        )

        assert created.status_code == 422
        assert updated.status_code == 422


@pytest.mark.asyncio
async def test_topic_content_length_and_blank_boundaries(authenticated_client):
    valid_payload = {
        'title': 'a' * TOPIC_TITLE_MAX_LENGTH,
        'description': 'd' * TOPIC_DESCRIPTION_MAX_LENGTH,
        'category': 'c' * TOPIC_CATEGORY_MAX_LENGTH,
        'vote_options': [
            'a' * TOPIC_OPTION_MAX_LENGTH,
            'b' * TOPIC_OPTION_MAX_LENGTH,
        ],
        'expires_at': future_expiration(),
    }

    accepted = await authenticated_client.post('/topics', json=valid_payload)
    assert accepted.status_code == 200

    invalid_fields = (
        {'description': ' '},
        {'description': 'd' * (TOPIC_DESCRIPTION_MAX_LENGTH + 1)},
        {'category': ' '},
        {'category': 'c' * (TOPIC_CATEGORY_MAX_LENGTH + 1)},
        {'vote_options': [' ', 'B']},
        {'vote_options': ['a' * (TOPIC_OPTION_MAX_LENGTH + 1), 'B']},
    )
    for changes in invalid_fields:
        response = await authenticated_client.post(
            '/topics',
            json=valid_payload | changes,
        )
        assert response.status_code == 422
