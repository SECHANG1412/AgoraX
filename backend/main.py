import os
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.concurrency import asynccontextmanager
from app.db.database import Base, async_engine
from app.db import models  # ensure all models (including new ones) are registered
from app.routers import user, topic, vote, comment, reply, like, oauth
from app.middleware.admin_auth import AdminBasicAuthMiddleware
from app.middleware.token_refresh import TokenRefreshMiddleware
from app.middleware.csrf import CSRFMiddleware
from app.admin.setup import setup_admin
from app.core.settings import settings

load_dotenv(dotenv_path=".env")


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
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
    ],
    allow_origin_regex=None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# CSRF should run before token refresh to ensure requests are validated early
app.add_middleware(CSRFMiddleware)
app.add_middleware(TokenRefreshMiddleware)

app.include_router(user.router)
app.include_router(oauth.router)
app.include_router(topic.router)
app.include_router(vote.router)
app.include_router(comment.router)
app.include_router(reply.router)
app.include_router(like.router)

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
