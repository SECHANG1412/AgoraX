import secrets
from fastapi import Request, Response, HTTPException
from jwt import ExpiredSignatureError, InvalidTokenError
from app.core.settings import settings
from app.core.jwt_handler import verify_token
from typing import Optional

def _cookie_policy() -> dict:
    """
    Returns cookie kwargs according to environment.
    PROD requires COOKIE_DOMAIN and sets secure/None.
    DEV keeps relaxed settings for local testing.
    """
    if settings.prod:
        if not settings.cookie_domain:
            raise HTTPException(
                status_code=500,
                detail="COOKIE_DOMAIN must be set in PROD mode.",
            )
        return {
            "secure": True,
            "samesite": "None",
            "domain": settings.cookie_domain,
        }

    return {
        "secure": False,
        "samesite": "Lax",
        "domain": None,
    }


def set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    csrf_token = secrets.token_hex(32)  # 32 bytes => 64 hex chars
    policy = _cookie_policy()
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=int(settings.access_token_expire.total_seconds()),
        **policy,
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        max_age=int(settings.refresh_token_expire.total_seconds()),
        **policy,
    )
    # CSRF cookie is readable by JS (not HttpOnly) for double-submit pattern
    response.set_cookie(
        key="csrf_token",
        value=csrf_token,
        httponly=False,
        max_age=int(settings.refresh_token_expire.total_seconds()),
        **policy,
    )

async def get_user_id(request: Request) -> int:
    access_token = request.cookies.get("access_token")
    if not access_token:
        raise HTTPException(status_code=401, detail="Access token missing")

    try:
        user_id = verify_token(access_token)
        if user_id is None:
            raise HTTPException(status_code=401, detail="Malformed token: no UID")
        return user_id
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Access token expired")
    except InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid access token")
    

async def get_user_id_optional(request: Request) -> Optional[int]:
    access_token = request.cookies.get("access_token")
    if not access_token:
        return None

    try:
        return verify_token(access_token)
    except (ExpiredSignatureError, InvalidTokenError):
        return None
