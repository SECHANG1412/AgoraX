from __future__ import annotations

from collections.abc import Sequence

import pytest
from tabulate import tabulate

from app.perf import build_explain_rows, clear_captured_stats
from tests.factories import (
    create_comment,
    create_reply,
    create_topic,
    create_topic_like,
    create_user,
    create_vote,
)

READ_API_MAX_QUERY_COUNTS = {
    "/topics": 2,
    "/topics/{topic_id}": 8,
    "/comments/by-topic/{topic_id}": 15,
    "/votes/topic/{topic_id}?time_range=all&interval=1h": 4,
}


def _format_plan(plan: Sequence[dict]) -> str:
    fragments: list[str] = []
    for row in plan:
        if "detail" in row:
            fragments.append(str(row["detail"]))
        elif "EXPLAIN" in row:
            fragments.append(str(row["EXPLAIN"]))
        else:
            fragments.append(", ".join(f"{key}={value}" for key, value in row.items()))
    return " | ".join(fragments)


def _perf_table(rows: list[dict]) -> str:
    table_rows = [
        [
            row["endpoint"],
            row["query_count"],
            f"{row['query_time_ms']:.3f}",
            f"{row['response_time_ms']:.3f}",
            row["unique_selects"],
        ]
        for row in rows
    ]
    return tabulate(
        table_rows,
        headers=[
            "endpoint",
            "query_count",
            "query_time_ms",
            "response_time_ms",
            "unique_selects",
        ],
        tablefmt="grid",
    )


def _baseline_row(endpoint: str, response, explain_rows: list[dict]) -> dict:
    return {
        "endpoint": endpoint,
        "query_count": int(response.headers["X-Perf-Query-Count"]),
        "query_time_ms": float(response.headers["X-Perf-Query-Time-Ms"]),
        "response_time_ms": float(response.headers["X-Perf-Response-Time-Ms"]),
        "unique_selects": len(explain_rows),
    }


def _print_explain(label: str, explain_rows: list[dict]) -> None:
    print(f"[EXPLAIN] {label}")
    for row in explain_rows:
        print(f"- {row['sql']}")
        print(f"  {_format_plan(row['plan'])}")


def _assert_query_count_limits(rows: list[dict]) -> None:
    for row in rows:
        query_limit = READ_API_MAX_QUERY_COUNTS[row["endpoint"]]
        assert row["query_count"] <= query_limit, (
            f"{row['endpoint']} query count increased: "
            f"expected <= {query_limit}, actual {row['query_count']}"
        )


def test_query_count_limits_report_regression():
    rows = [
        {
            "endpoint": "/topics",
            "query_count": READ_API_MAX_QUERY_COUNTS["/topics"] + 1,
        }
    ]

    with pytest.raises(AssertionError, match=r"/topics query count increased"):
        _assert_query_count_limits(rows)


@pytest.mark.asyncio
async def test_read_api_perf_baseline(
    authenticated_client,
    db_session,
    auth_user,
):
    clear_captured_stats()

    topic = await create_topic(db_session, user_id=auth_user.user_id, title="perf-target")
    commenters = [await create_user(db_session) for _ in range(3)]
    voters = [await create_user(db_session) for _ in range(4)]
    likers = [await create_user(db_session) for _ in range(4)]

    await create_vote(db_session, user_id=auth_user.user_id, topic_id=topic.topic_id, vote_index=0)
    for idx, voter in enumerate(voters):
        await create_vote(db_session, user_id=voter.user_id, topic_id=topic.topic_id, vote_index=idx % 2)

    for liker in likers[:3]:
        await create_topic_like(db_session, user_id=liker.user_id, topic_id=topic.topic_id)

    comments = []
    for idx, commenter in enumerate(commenters):
        comment = await create_comment(
            db_session,
            user_id=commenter.user_id,
            topic_id=topic.topic_id,
            content=f"comment-{idx}",
        )
        comments.append(comment)

    await create_reply(
        db_session,
        user_id=auth_user.user_id,
        comment_id=comments[0].comment_id,
        content="reply-root",
    )
    child = await create_reply(
        db_session,
        user_id=commenters[1].user_id,
        comment_id=comments[0].comment_id,
        content="reply-child",
    )
    await create_reply(
        db_session,
        user_id=commenters[2].user_id,
        comment_id=comments[0].comment_id,
        content="reply-nested",
        parent_reply_id=child.reply_id,
    )
    await create_reply(
        db_session,
        user_id=auth_user.user_id,
        comment_id=comments[1].comment_id,
        content="reply-second-comment",
    )
    await db_session.commit()

    topic_response = await authenticated_client.get(
        f"/topics/{topic.topic_id}",
        headers={"X-Perf-Debug": "1"},
    )
    topics_response = await authenticated_client.get(
        "/topics",
        params={"limit": 10, "offset": 0},
        headers={"X-Perf-Debug": "1"},
    )
    comments_response = await authenticated_client.get(
        f"/comments/by-topic/{topic.topic_id}",
        headers={"X-Perf-Debug": "1"},
    )
    vote_stats_response = await authenticated_client.get(
        f"/votes/topic/{topic.topic_id}",
        params={"time_range": "all", "interval": "1h"},
        headers={"X-Perf-Debug": "1"},
    )

    assert topic_response.status_code == 200
    assert topics_response.status_code == 200
    assert comments_response.status_code == 200
    assert vote_stats_response.status_code == 200

    topic_trace_id = topic_response.headers["X-Perf-Trace-Id"]
    topics_trace_id = topics_response.headers["X-Perf-Trace-Id"]
    comments_trace_id = comments_response.headers["X-Perf-Trace-Id"]
    vote_stats_trace_id = vote_stats_response.headers["X-Perf-Trace-Id"]
    topic_explain = await build_explain_rows(db_session, topic_trace_id)
    topics_explain = await build_explain_rows(db_session, topics_trace_id)
    comments_explain = await build_explain_rows(db_session, comments_trace_id)
    vote_stats_explain = await build_explain_rows(db_session, vote_stats_trace_id)

    baseline_rows = [
        _baseline_row("/topics", topics_response, topics_explain),
        _baseline_row("/topics/{topic_id}", topic_response, topic_explain),
        _baseline_row(
            "/comments/by-topic/{topic_id}",
            comments_response,
            comments_explain,
        ),
        _baseline_row(
            "/votes/topic/{topic_id}?time_range=all&interval=1h",
            vote_stats_response,
            vote_stats_explain,
        ),
    ]

    print()
    print(_perf_table(baseline_rows))
    print()
    _print_explain("/topics", topics_explain)
    _print_explain("/topics/{topic_id}", topic_explain)
    _print_explain("/comments/by-topic/{topic_id}", comments_explain)
    _print_explain("/votes/topic/{topic_id}", vote_stats_explain)
    _assert_query_count_limits(baseline_rows)
    assert baseline_rows[0]["query_count"] > 0
    assert baseline_rows[1]["query_count"] > 0
    assert baseline_rows[2]["query_count"] > 0
    assert baseline_rows[3]["query_count"] > 0
    assert len(topics_explain) > 0
    assert len(topic_explain) > 0
    assert len(comments_explain) > 0
    assert len(vote_stats_explain) > 0
