from __future__ import annotations

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.metrics import http_request_duration_seconds, http_requests_total
from app.middleware.prometheus import PrometheusMiddleware, UNMATCHED_ROUTE_PATH


def _request_count(method: str, path: str, status: str) -> float:
    return http_requests_total.labels(
        method=method, path=path, status=status
    )._value.get()


def _duration_count(method: str, path: str) -> float:
    histogram = http_request_duration_seconds.labels(
        method=method, path=path
    )
    return next(
        sample.value
        for sample in histogram.collect()[0].samples
        if sample.name.endswith('_count')
    )


@pytest.fixture
def metrics_app() -> FastAPI:
    app = FastAPI()
    app.add_middleware(PrometheusMiddleware)

    @app.get('/items/{item_id}')
    async def get_item(item_id: int):
        return {'item_id': item_id}

    @app.get('/boom')
    async def raise_error():
        raise RuntimeError('boom')

    return app


@pytest.fixture
async def metrics_client(metrics_app: FastAPI):
    transport = ASGITransport(app=metrics_app)
    async with AsyncClient(
        transport=transport, base_url='http://testserver'
    ) as client:
        yield client


@pytest.mark.asyncio
async def test_dynamic_paths_share_route_template_label(metrics_client):
    route_path = '/items/{item_id}'
    requests_before = _request_count('GET', route_path, '200')
    durations_before = _duration_count('GET', route_path)

    first_response = await metrics_client.get('/items/1')
    second_response = await metrics_client.get('/items/999')

    assert first_response.status_code == 200
    assert second_response.status_code == 200
    assert _request_count('GET', route_path, '200') == requests_before + 2
    assert _duration_count('GET', route_path) == durations_before + 2


@pytest.mark.asyncio
async def test_unmatched_paths_share_fixed_label(metrics_client):
    requests_before = _request_count('GET', UNMATCHED_ROUTE_PATH, '404')

    first_response = await metrics_client.get('/missing-one')
    second_response = await metrics_client.get('/missing-two')

    assert first_response.status_code == 404
    assert second_response.status_code == 404
    assert (
        _request_count('GET', UNMATCHED_ROUTE_PATH, '404')
        == requests_before + 2
    )


@pytest.mark.asyncio
async def test_exception_is_recorded_as_500_and_propagated(metrics_app):
    route_path = '/boom'
    requests_before = _request_count('GET', route_path, '500')
    durations_before = _duration_count('GET', route_path)
    transport = ASGITransport(app=metrics_app, raise_app_exceptions=True)

    async with AsyncClient(
        transport=transport, base_url='http://testserver'
    ) as client:
        with pytest.raises(RuntimeError, match='boom'):
            await client.get(route_path)

    assert _request_count('GET', route_path, '500') == requests_before + 1
    assert _duration_count('GET', route_path) == durations_before + 1
