import uvicorn
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.concurrency import asynccontextmanager
from fastapi.responses import Response
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import async_engine, get_db
from app.db import models as models  # keep model registration side effects
from app.routers import (
    admin,
    comment,
    inquiry,
    like,
    notification,
    oauth,
    reply,
    report,
    topic,
    user,
    vote,
)
from app.middleware.admin_auth import AdminBasicAuthMiddleware
from app.middleware.token_refresh import TokenRefreshMiddleware
from app.middleware.csrf import CSRFMiddleware
from app.middleware.performance import PerformanceMiddleware
from app.middleware.prometheus import PrometheusMiddleware
from app.middleware.rate_limit import RateLimitMiddleware
from app.metrics import render_metrics
from app.admin.setup import setup_admin
from app.core.redis import close_redis_client, create_redis_client
from app.core.settings import settings
from app.db.schemas.health import DatabaseHealthResponse, HealthResponse

load_dotenv(dotenv_path=".env")


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.redis_client = await create_redis_client()
    try:
        yield
    finally:
        await close_redis_client(getattr(app.state, "redis_client", None))
        await async_engine.dispose()


app = FastAPI(lifespan=lifespan)

# /admin protection: enforce BasicAuth only in PROD
app.add_middleware(
    AdminBasicAuthMiddleware,
    username=settings.admin_username,
    password=settings.admin_password,
)

setup_admin(app, async_engine)

# CORS should run before custom middleware so that preflight/headers are applied
app.add_middleware(
    CORSMiddleware,
    # When sending cookies (withCredentials), wildcard origins are not allowed.
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "https://waggle.kr",
        "https://www.waggle.kr",
    ],
    allow_origin_regex=None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# CSRF should run before token refresh to ensure requests are validated early
app.add_middleware(PrometheusMiddleware)
app.add_middleware(PerformanceMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(CSRFMiddleware)
app.add_middleware(TokenRefreshMiddleware)

app.include_router(user.router)
app.include_router(oauth.router)
app.include_router(topic.router)
app.include_router(vote.router)
app.include_router(comment.router)
app.include_router(reply.router)
app.include_router(like.router)
app.include_router(inquiry.router)
app.include_router(admin.router)
app.include_router(notification.router)
app.include_router(report.router)


@app.get("/metrics")
async def metrics():
    payload, content_type = render_metrics()
    return Response(content=payload, media_type=content_type)


@app.get("/health", response_model=HealthResponse)
async def health():
    return {"status": "ok"}


@app.get("/health/db", response_model=DatabaseHealthResponse)
async def health_db(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(text("SELECT 1"))
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail={"status": "error", "database": "disconnected"},
        ) from exc

    return {"status": "ok", "database": "connected"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
