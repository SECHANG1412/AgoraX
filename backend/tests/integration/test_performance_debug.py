from __future__ import annotations

import pytest

from app import perf
from app.core.settings import settings


@pytest.fixture(autouse=True)
def clear_performance_captures():
    perf.clear_captured_stats()
    yield
    perf.clear_captured_stats()


@pytest.mark.asyncio
async def test_performance_debug_header_is_ignored_when_disabled(
    client,
    monkeypatch,
):
    monkeypatch.setattr(settings, "performance_debug_enabled", False)

    response = await client.get("/health", headers={"X-Perf-Debug": "1"})

    assert response.status_code == 200
    assert "X-Perf-Trace-Id" not in response.headers
    assert "X-Perf-Query-Count" not in response.headers


def test_performance_captures_are_limited_to_recent_entries():
    trace_ids = []

    for _ in range(perf.CAPTURED_STATS_MAX_ENTRIES + 1):
        trace_ids.append(perf.begin_request_capture())
        perf.finish_request_capture()

    assert perf.get_captured_stats(trace_ids[0]) is None
    assert perf.get_captured_stats(trace_ids[-1]) is not None


def test_performance_capture_expires_after_ttl(monkeypatch):
    now = [0.0]
    monkeypatch.setattr(perf.time, "perf_counter", lambda: now[0])

    trace_id = perf.begin_request_capture()
    perf.finish_request_capture()
    now[0] = perf.CAPTURED_STATS_TTL_SECONDS + 1

    assert perf.get_captured_stats(trace_id) is None


def test_popping_performance_capture_removes_it():
    trace_id = perf.begin_request_capture()
    perf.finish_request_capture()

    captured = perf.pop_captured_stats(trace_id)

    assert captured is not None
    assert captured.trace_id == trace_id
    assert perf.get_captured_stats(trace_id) is None
