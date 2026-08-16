import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.db.models import AdminActionLog, Notification, Reply, Report, Topic
from tests.factories import create_comment, create_reply, create_topic, create_user


async def _create_report(
    client: AsyncClient,
    set_auth_cookies,
    reporter_user_id: int,
    *,
    target_type: str,
    target_id: int,
    reason: str = "spam",
):
    set_auth_cookies(client, reporter_user_id)
    response = await client.post(
        "/reports",
        json={"target_type": target_type, "target_id": target_id, "reason": reason},
    )
    assert response.status_code == 201
    return response.json()


@pytest.mark.asyncio
async def test_admin_report_list_requires_admin(
    client: AsyncClient, db_session, set_auth_cookies
):
    unauthenticated = await client.get("/manage-api/reports")
    assert unauthenticated.status_code == 401

    user = await create_user(db_session)
    await db_session.commit()
    set_auth_cookies(client, user.user_id)
    forbidden = await client.get("/manage-api/reports")
    assert forbidden.status_code == 403


@pytest.mark.asyncio
async def test_admin_report_list_includes_snapshot_and_aggregate_count(
    client: AsyncClient, db_session, set_auth_cookies
):
    owner = await create_user(db_session)
    reporter_one = await create_user(db_session, username="reporter-one")
    reporter_two = await create_user(db_session, username="reporter-two")
    admin = await create_user(db_session, is_admin=True)
    topic = await create_topic(db_session, user_id=owner.user_id, title="reported")
    await db_session.commit()
    await _create_report(
        client, set_auth_cookies, reporter_one.user_id, target_type="topic", target_id=topic.topic_id
    )
    await _create_report(
        client, set_auth_cookies, reporter_two.user_id, target_type="topic", target_id=topic.topic_id
    )
    set_auth_cookies(client, admin.user_id)

    response = await client.get("/manage-api/reports", params={"status": "pending"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 2
    assert {item["reporter_name"] for item in payload["items"]} == {
        "reporter-one",
        "reporter-two",
    }
    assert all(item["report_count"] == 2 for item in payload["items"])
    assert all(
        item["target_snapshot"]["title"] == "reported" for item in payload["items"]
    )


@pytest.mark.asyncio
async def test_admin_dismisses_all_reports_for_same_target_and_notifies_reporters(
    client: AsyncClient, db_session, set_auth_cookies
):
    owner = await create_user(db_session)
    reporters = [await create_user(db_session), await create_user(db_session)]
    admin = await create_user(db_session, is_admin=True)
    topic = await create_topic(db_session, user_id=owner.user_id)
    await db_session.commit()
    created = []
    for reporter in reporters:
        created.append(
            await _create_report(
                client, set_auth_cookies, reporter.user_id,
                target_type="topic", target_id=topic.topic_id,
            )
        )
    set_auth_cookies(client, admin.user_id)

    response = await client.patch(
        f"/manage-api/reports/{created[0]['report_id']}/dismiss",
        json={"resolution": "정책 위반이 확인되지 않음"},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "dismissed"
    result = await db_session.execute(select(Report).order_by(Report.report_id))
    reports = list(result.scalars().all())
    assert {report.status for report in reports} == {"dismissed"}
    assert {report.handled_by for report in reports} == {admin.user_id}
    result = await db_session.execute(
        select(Notification).where(Notification.type == "report_status")
    )
    assert {notification.user_id for notification in result.scalars().all()} == {
        reporter.user_id for reporter in reporters
    }
    result = await db_session.execute(
        select(AdminActionLog).where(AdminActionLog.action == "DISMISS_REPORT")
    )
    assert result.scalar_one().reason == "정책 위반이 확인되지 않음"


@pytest.mark.asyncio
async def test_admin_resolves_topic_and_related_comment_reports_atomically(
    client: AsyncClient, db_session, set_auth_cookies
):
    owner = await create_user(db_session)
    reporter = await create_user(db_session)
    admin = await create_user(db_session, is_admin=True)
    topic = await create_topic(db_session, user_id=owner.user_id)
    comment = await create_comment(
        db_session, user_id=owner.user_id, topic_id=topic.topic_id
    )
    await db_session.commit()
    topic_report = await _create_report(
        client, set_auth_cookies, reporter.user_id,
        target_type="topic", target_id=topic.topic_id,
    )
    await _create_report(
        client, set_auth_cookies, reporter.user_id,
        target_type="comment", target_id=comment.comment_id,
    )
    set_auth_cookies(client, admin.user_id)

    response = await client.patch(
        f"/manage-api/reports/{topic_report['report_id']}/resolve",
        json={"resolution": "광고성 콘텐츠"},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "resolved"
    deleted_topic = await db_session.execute(select(Topic).where(Topic.topic_id == topic.topic_id))
    assert deleted_topic.scalar_one_or_none() is None
    result = await db_session.execute(select(Report))
    reports = list(result.scalars().all())
    assert {report.status for report in reports} == {"resolved"}
    actions = (await db_session.execute(select(AdminActionLog.action))).scalars().all()
    assert "DELETE_TOPIC" in actions
    assert "RESOLVE_REPORT" in actions


@pytest.mark.asyncio
async def test_admin_can_resolve_reply_report(
    client: AsyncClient, db_session, set_auth_cookies
):
    owner = await create_user(db_session)
    reporter = await create_user(db_session)
    admin = await create_user(db_session, is_admin=True)
    topic = await create_topic(db_session, user_id=owner.user_id)
    comment = await create_comment(
        db_session, user_id=owner.user_id, topic_id=topic.topic_id
    )
    reply = await create_reply(
        db_session, user_id=owner.user_id, comment_id=comment.comment_id
    )
    await db_session.commit()
    report = await _create_report(
        client, set_auth_cookies, reporter.user_id,
        target_type="reply", target_id=reply.reply_id,
    )
    set_auth_cookies(client, admin.user_id)

    response = await client.patch(
        f"/manage-api/reports/{report['report_id']}/resolve",
        json={"resolution": "욕설 포함"},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "resolved"
    deleted_reply = await db_session.execute(select(Reply).where(Reply.reply_id == reply.reply_id))
    assert deleted_reply.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_handled_report_cannot_be_processed_again(
    client: AsyncClient, db_session, set_auth_cookies
):
    owner = await create_user(db_session)
    reporter = await create_user(db_session)
    admin = await create_user(db_session, is_admin=True)
    topic = await create_topic(db_session, user_id=owner.user_id)
    await db_session.commit()
    report = await _create_report(
        client, set_auth_cookies, reporter.user_id,
        target_type="topic", target_id=topic.topic_id,
    )
    set_auth_cookies(client, admin.user_id)
    first = await client.patch(
        f"/manage-api/reports/{report['report_id']}/dismiss",
        json={"resolution": "위반 아님"},
    )
    second = await client.patch(
        f"/manage-api/reports/{report['report_id']}/dismiss",
        json={"resolution": "다시 처리"},
    )

    assert first.status_code == 200
    assert second.status_code == 409
