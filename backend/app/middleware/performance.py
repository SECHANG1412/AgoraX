from __future__ import annotations

from starlette.middleware.base import BaseHTTPMiddleware

from app.core.settings import settings
from app.perf import begin_request_capture, finish_request_capture


class PerformanceMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        if (
            not settings.performance_debug_enabled
            or request.headers.get("X-Perf-Debug") != "1"
        ):
            return await call_next(request)

        trace_id = begin_request_capture()
        response = None
        try:
            response = await call_next(request)
        except Exception:
            finish_request_capture()
            raise
        finally:
            if response is not None:
                stats = finish_request_capture()
            else:
                stats = None

        if stats is not None:
            response.headers["X-Perf-Trace-Id"] = trace_id
            response.headers["X-Perf-Query-Count"] = str(stats.query_count)
            response.headers["X-Perf-Query-Time-Ms"] = f"{stats.query_time_ms:.3f}"
            response.headers["X-Perf-Response-Time-Ms"] = f"{stats.response_time_ms:.3f}"

        return response
