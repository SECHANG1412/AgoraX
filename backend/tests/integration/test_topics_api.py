from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select

from app.db.models import PinnedTopic
from tests.factories import create_topic, create_vote


def future_expiration() -> str:
    return (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()


@pytest.mark.asyncio
async def test_create_topic_includes_author_name(authenticated_client, auth_user):
    response = await authenticated_client.post(
        "/topics",
        json={
            "title": "created-topic",
            "description": "desc",
            "category": "general",
            "vote_options": ["A", "B"],
            "expires_at": future_expiration(),
        },
    )

    assert response.status_code == 200
    assert response.json()["author_name"] == auth_user.username


@pytest.mark.asyncio
async def test_create_topic_requires_exactly_two_vote_options(authenticated_client):
    response = await authenticated_client.post(
        "/topics",
        json={
            "title": "invalid-options",
            "description": "desc",
            "category": "general",
            "vote_options": ["A", "B", "C"],
            "expires_at": future_expiration(),
        },
    )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_topic_rejects_too_long_title(authenticated_client):
    response = await authenticated_client.post(
        "/topics",
        json={
            "title": "A" * 81,
            "description": "desc",
            "category": "general",
            "vote_options": ["A", "B"],
            "expires_at": future_expiration(),
        },
    )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_topic_requires_future_expiration(authenticated_client):
    missing = await authenticated_client.post(
        "/topics",
        json={
            "title": "missing-expiration",
            "description": "desc",
            "category": "general",
            "vote_options": ["A", "B"],
        },
    )
    past = await authenticated_client.post(
        "/topics",
        json={
            "title": "past-expiration",
            "description": "desc",
            "category": "general",
            "vote_options": ["A", "B"],
            "expires_at": (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat(),
        },
    )

    assert missing.status_code == 422
    assert past.status_code == 422


@pytest.mark.asyncio
async def test_topics_list_filters_and_sort_by_like_count(authenticated_client, db_session, auth_user):
    t1 = await create_topic(
        db_session,
        user_id=auth_user.user_id,
        title="alpha topic",
        category="sports",
        created_at=datetime.now(timezone.utc) - timedelta(minutes=10),
    )
    t2 = await create_topic(
        db_session,
        user_id=auth_user.user_id,
        title="beta topic",
        category="sports",
        created_at=datetime.now(timezone.utc) - timedelta(minutes=5),
    )
    t3 = await create_topic(
        db_session,
        user_id=auth_user.user_id,
        title="gamma topic",
        category="music",
        created_at=datetime.now(timezone.utc),
    )

    # Create extra likes so that t1 should be ahead of t2 when sorted by like_count.
    from tests.factories import create_topic_like, create_user

    liker_1 = await create_user(db_session)
    liker_2 = await create_user(db_session)
    await create_topic_like(db_session, user_id=liker_1.user_id, topic_id=t1.topic_id)
    await create_topic_like(db_session, user_id=liker_2.user_id, topic_id=t1.topic_id)
    await create_topic_like(db_session, user_id=liker_1.user_id, topic_id=t2.topic_id)
    await db_session.commit()

    response = await authenticated_client.get(
        "/topics",
        params={"category": "sports", "search": "topic", "sort": "like_count", "limit": 10, "offset": 0},
    )
    assert response.status_code == 200
    payload = response.json()
    assert [item["topic_id"] for item in payload] == [t1.topic_id, t2.topic_id]
    assert all(item["category"] == "sports" for item in payload)
    assert all("topic" in item["title"] for item in payload)
    assert all(item["author_name"] == auth_user.username for item in payload)
    assert t3.topic_id not in [item["topic_id"] for item in payload]


@pytest.mark.asyncio
async def test_topic_detail_success_and_not_found(authenticated_client, db_session, auth_user):
    topic = await create_topic(db_session, user_id=auth_user.user_id, title="detail-target")
    await db_session.commit()

    ok = await authenticated_client.get(f"/topics/{topic.topic_id}")
    missing = await authenticated_client.get("/topics/999999")

    assert ok.status_code == 200
    assert ok.json()["topic_id"] == topic.topic_id
    assert ok.json()["author_name"] == auth_user.username
    assert missing.status_code == 404


@pytest.mark.asyncio
async def test_topics_list_excludes_hidden_topics(
    authenticated_client,
    db_session,
    auth_user,
):
    public_topic = await create_topic(
        db_session,
        user_id=auth_user.user_id,
        title="public-topic",
    )
    hidden_topic = await create_topic(
        db_session,
        user_id=auth_user.user_id,
        title="hidden-topic",
        is_hidden=True,
    )
    await db_session.commit()

    response = await authenticated_client.get("/topics", params={"limit": 10, "offset": 0})

    assert response.status_code == 200
    topic_ids = [item["topic_id"] for item in response.json()]
    assert public_topic.topic_id in topic_ids
    assert hidden_topic.topic_id not in topic_ids


@pytest.mark.asyncio
async def test_topics_status_filter_contract(authenticated_client, db_session, auth_user):
    now = datetime.now(timezone.utc)
    legacy_topic = await create_topic(
        db_session,
        user_id=auth_user.user_id,
        title="legacy-active-topic",
        created_at=now - timedelta(minutes=3),
    )
    active_topic = await create_topic(
        db_session,
        user_id=auth_user.user_id,
        title="future-active-topic",
        expires_at=now + timedelta(days=1),
        created_at=now - timedelta(minutes=2),
    )
    closed_topic = await create_topic(
        db_session,
        user_id=auth_user.user_id,
        title="closed-topic",
        expires_at=now - timedelta(minutes=1),
        created_at=now,
    )
    await create_vote(
        db_session,
        user_id=auth_user.user_id,
        topic_id=active_topic.topic_id,
        vote_index=0,
    )
    await db_session.commit()

    default_response = await authenticated_client.get(
        "/topics",
        params={"limit": 10, "offset": 0},
    )
    closed_response = await authenticated_client.get(
        "/topics",
        params={"status": "closed", "limit": 10, "offset": 0},
    )
    voted_response = await authenticated_client.get(
        "/topics",
        params={"status": "voted", "limit": 10, "offset": 0},
    )
    all_response = await authenticated_client.get(
        "/topics",
        params={"status": "all", "limit": 10, "offset": 0},
    )

    assert default_response.status_code == 200
    default_payload = default_response.json()
    default_ids = [item["topic_id"] for item in default_payload]
    assert legacy_topic.topic_id in default_ids
    assert active_topic.topic_id not in default_ids
    assert closed_topic.topic_id not in default_ids
    assert all(item["is_closed"] is False for item in default_payload)
    assert all(item["has_voted"] is False for item in default_payload)

    assert closed_response.status_code == 200
    closed_payload = closed_response.json()
    assert [item["topic_id"] for item in closed_payload] == [closed_topic.topic_id]
    assert closed_payload[0]["is_closed"] is True

    assert voted_response.status_code == 200
    voted_payload = voted_response.json()
    assert [item["topic_id"] for item in voted_payload] == [active_topic.topic_id]
    assert voted_payload[0]["has_voted"] is True

    assert all_response.status_code == 200
    all_payload = all_response.json()
    all_ids = [item["topic_id"] for item in all_payload]
    assert all_ids.index(closed_topic.topic_id) > all_ids.index(active_topic.topic_id)
    assert all_ids.index(closed_topic.topic_id) > all_ids.index(legacy_topic.topic_id)


@pytest.mark.asyncio
async def test_topics_count_uses_status_filter(authenticated_client, db_session, auth_user):
    now = datetime.now(timezone.utc)
    active_topic = await create_topic(db_session, user_id=auth_user.user_id, title="legacy-active")
    await create_topic(
        db_session,
        user_id=auth_user.user_id,
        title="closed-count",
        expires_at=now - timedelta(minutes=1),
    )
    await create_vote(
        db_session,
        user_id=auth_user.user_id,
        topic_id=active_topic.topic_id,
        vote_index=0,
    )
    await db_session.commit()

    active = await authenticated_client.get("/topics/count")
    closed = await authenticated_client.get("/topics/count", params={"status": "closed"})
    voted = await authenticated_client.get("/topics/count", params={"status": "voted"})
    all_topics = await authenticated_client.get("/topics/count", params={"status": "all"})

    assert active.status_code == 200
    assert closed.status_code == 200
    assert voted.status_code == 200
    assert all_topics.status_code == 200
    assert active.json() == 0
    assert closed.json() == 1
    assert voted.json() == 1
    assert all_topics.json() == 2


@pytest.mark.asyncio
async def test_hidden_topic_detail_returns_404(
    authenticated_client,
    db_session,
    auth_user,
):
    hidden_topic = await create_topic(
        db_session,
        user_id=auth_user.user_id,
        title="hidden-detail",
        is_hidden=True,
    )
    await db_session.commit()

    response = await authenticated_client.get(f"/topics/{hidden_topic.topic_id}")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_topic_pin_success_and_missing_topic_returns_404(
    authenticated_client,
    db_session,
    auth_user,
):
    topic = await create_topic(db_session, user_id=auth_user.user_id, title="pin-target")
    await db_session.commit()

    pinned = await authenticated_client.post(f"/topics/{topic.topic_id}/pin")
    missing = await authenticated_client.post("/topics/999999/pin")

    assert pinned.status_code == 200
    assert pinned.json() is True
    assert missing.status_code == 404
    assert missing.json()["detail"] == "Topic not found"


@pytest.mark.asyncio
async def test_delete_topic_removes_pinned_references(
    authenticated_client,
    db_session,
    auth_user,
):
    topic = await create_topic(db_session, user_id=auth_user.user_id, title="delete-pinned")
    await db_session.commit()

    pinned = await authenticated_client.post(f"/topics/{topic.topic_id}/pin")
    assert pinned.status_code == 200

    deleted = await authenticated_client.delete(f"/topics/{topic.topic_id}")
    assert deleted.status_code == 200
    assert deleted.json() is True

    remaining_pinned = await db_session.execute(
        select(PinnedTopic).where(PinnedTopic.topic_id == topic.topic_id)
    )
    assert remaining_pinned.scalars().all() == []


@pytest.mark.asyncio
async def test_topics_list_validation_errors(authenticated_client):
    invalid_limit = await authenticated_client.get("/topics", params={"limit": 0})
    invalid_offset = await authenticated_client.get("/topics", params={"offset": -1})
    invalid_sort = await authenticated_client.get("/topics", params={"sort": "wrong-value"})

    assert invalid_limit.status_code == 422
    assert invalid_offset.status_code == 422
    assert invalid_sort.status_code == 422


@pytest.mark.asyncio
@pytest.mark.parametrize('path', ['/topics', '/topics/count'])
async def test_topic_search_length_boundary(authenticated_client, path):
    accepted = await authenticated_client.get(path, params={'search': 'a' * 100})
    rejected = await authenticated_client.get(path, params={'search': 'a' * 101})

    assert accepted.status_code == 200
    assert rejected.status_code == 422
