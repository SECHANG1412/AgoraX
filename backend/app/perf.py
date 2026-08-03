from __future__ import annotations

import time
import uuid
from contextvars import ContextVar
from dataclasses import dataclass, field
from typing import Any

from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

CAPTURED_STATS_MAX_ENTRIES = 100
CAPTURED_STATS_TTL_SECONDS = 600


@dataclass
class QueryRecord:
    statement: str
    parameters: Any
    duration_ms: float


@dataclass
class RequestPerfStats:
    trace_id: str
    started_at: float
    query_count: int = 0
    query_time_ms: float = 0.0
    queries: list[QueryRecord] = field(default_factory=list)
    response_time_ms: float = 0.0


_current_stats: ContextVar[RequestPerfStats | None] = ContextVar(
    "current_request_perf_stats",
    default=None,
)
_query_started_at: ContextVar[float | None] = ContextVar(
    "current_query_started_at",
    default=None,
)
_captured_stats: dict[str, RequestPerfStats] = {}
_registered_engine_ids: set[int] = set()


def _prune_captured_stats(now: float) -> None:
    expired_trace_ids = [
        trace_id
        for trace_id, stats in _captured_stats.items()
        if now - stats.started_at >= CAPTURED_STATS_TTL_SECONDS
    ]
    for trace_id in expired_trace_ids:
        _captured_stats.pop(trace_id, None)

    while len(_captured_stats) > CAPTURED_STATS_MAX_ENTRIES:
        oldest_trace_id = next(iter(_captured_stats))
        _captured_stats.pop(oldest_trace_id, None)


def begin_request_capture() -> str:
    trace_id = uuid.uuid4().hex
    _current_stats.set(
        RequestPerfStats(trace_id=trace_id, started_at=time.perf_counter())
    )
    return trace_id


def finish_request_capture() -> RequestPerfStats | None:
    stats = _current_stats.get()
    if stats is None:
        return None

    stats.response_time_ms = (time.perf_counter() - stats.started_at) * 1000
    _captured_stats[stats.trace_id] = stats
    _prune_captured_stats(time.perf_counter())
    _current_stats.set(None)
    return stats


def get_captured_stats(trace_id: str) -> RequestPerfStats | None:
    _prune_captured_stats(time.perf_counter())
    return _captured_stats.get(trace_id)


def pop_captured_stats(trace_id: str) -> RequestPerfStats | None:
    _prune_captured_stats(time.perf_counter())
    return _captured_stats.pop(trace_id, None)


def clear_captured_stats() -> None:
    _captured_stats.clear()


def _should_explain(statement: str) -> bool:
    normalized = statement.lstrip().upper()
    return normalized.startswith("SELECT")


def _normalize_sql(statement: str) -> str:
    return " ".join(statement.split())


async def build_explain_rows(db: AsyncSession, trace_id: str) -> list[dict[str, Any]]:
    stats = pop_captured_stats(trace_id)
    if not stats:
        return []

    dialect_name = db.bind.dialect.name if db.bind is not None else ""
    explain_rows: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()
    conn = await db.connection()

    for query in stats.queries:
        if not _should_explain(query.statement):
            continue

        normalized = _normalize_sql(query.statement)
        query_key = (dialect_name, normalized)
        if query_key in seen:
            continue
        seen.add(query_key)

        if dialect_name == "sqlite":
            explain_sql = f"EXPLAIN QUERY PLAN {query.statement}"
        else:
            explain_sql = f"EXPLAIN {query.statement}"

        result = await conn.exec_driver_sql(explain_sql, query.parameters)
        explain_rows.append(
            {
                "sql": normalized,
                "plan": [dict(row._mapping) for row in result.fetchall()],
            }
        )

    return explain_rows


def register_async_engine_perf_hooks(async_engine: AsyncEngine) -> None:
    sync_engine = async_engine.sync_engine
    engine_id = id(sync_engine)
    if engine_id in _registered_engine_ids:
        return

    @event.listens_for(sync_engine, "before_cursor_execute")
    def _before_cursor_execute(
        conn,
        cursor,
        statement,
        parameters,
        context,
        executemany,
    ):
        if _current_stats.get() is None:
            return
        _query_started_at.set(time.perf_counter())

    @event.listens_for(sync_engine, "after_cursor_execute")
    def _after_cursor_execute(
        conn,
        cursor,
        statement,
        parameters,
        context,
        executemany,
    ):
        stats = _current_stats.get()
        started_at = _query_started_at.get()
        if stats is None or started_at is None:
            return

        duration_ms = (time.perf_counter() - started_at) * 1000
        stats.query_count += 1
        stats.query_time_ms += duration_ms
        stats.queries.append(
            QueryRecord(
                statement=statement,
                parameters=parameters,
                duration_ms=duration_ms,
            )
        )
        _query_started_at.set(None)

    _registered_engine_ids.add(engine_id)
