from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request
from fastapi.responses import JSONResponse
from jwt import ExpiredSignatureError, InvalidTokenError
from app.db.database import AsyncSessionLocal
from app.core.jwt_handler import verify_token, create_access_token, create_refresh_token
from app.db.crud import UserCrud
from app.core.auth import set_auth_cookies


class TokenRefreshMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        access_token = request.cookies.get("access_token")
        refresh_token = request.cookies.get("refresh_token")

        try:
            if access_token:
                verify_token(access_token)
                return response
        except (ExpiredSignatureError, InvalidTokenError):
            pass

        if refresh_token:
            try:
                user_id = verify_token(refresh_token)
            except (ExpiredSignatureError, InvalidTokenError):
                # refresh 토큰이 만료/무효면 쿠키를 정리하고 기존 응답을 그대로 돌려준다.
                response.delete_cookie(key="access_token")
                response.delete_cookie(key="refresh_token")
                return response

            async with AsyncSessionLocal() as db:
                user = await UserCrud.get_by_id(db, user_id)
                if not user or user.refresh_token != refresh_token:
                    response.delete_cookie(key="access_token")
                    response.delete_cookie(key="refresh_token")
                    return response

                new_access_token = create_access_token(user_id)
                new_refresh_token = create_refresh_token(user_id)

                try:
                    await UserCrud.update_refresh_token_by_id(db, user_id, new_refresh_token)
                    await db.commit()
                except Exception:
                    await db.rollback()
                    raise

                set_auth_cookies(response, new_access_token, new_refresh_token)

        return response
