from __future__ import annotations

import time

from starlette.middleware.base import BaseHTTPMiddleware

from app.metrics import http_request_duration_seconds, http_requests_total

UNMATCHED_ROUTE_PATH = '/unmatched'


def _route_path(request) -> str:
    route = request.scope.get('route')
    return getattr(route, 'path', UNMATCHED_ROUTE_PATH)


class PrometheusMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        started_at = time.perf_counter()

        try:
            response = await call_next(request)
        except Exception:
            duration = time.perf_counter() - started_at
            route_path = _route_path(request)
            method = request.method

            http_requests_total.labels(
                method=method, path=route_path, status='500'
            ).inc()
            http_request_duration_seconds.labels(
                method=method, path=route_path
            ).observe(duration)
            raise

        duration = time.perf_counter() - started_at
        route_path = _route_path(request)
        method = request.method
        status = str(response.status_code)

        http_requests_total.labels(method=method, path=route_path, status=status).inc()
        http_request_duration_seconds.labels(method=method, path=route_path).observe(
            duration
        )

        return response
