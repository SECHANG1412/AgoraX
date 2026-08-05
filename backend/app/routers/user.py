# backend/routers/user.py

from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.services import UserService
from app.db.schemas.users import (
    UserLogin,
    UserRead,
    UserCreate,
    UserUpdate,
    UserStats,
    UserActivity,
    UserHiddenContent,
)
from app.core.auth import (
    clear_auth_cookies,
    get_user_id,
    set_auth_cookies,
)
from app.core.jwt_handler import verify_token, create_access_token, create_refresh_token
from jwt import ExpiredSignatureError, InvalidTokenError
from fastapi import HTTPException, Request
from app.db.crud import UserCrud

router = APIRouter(prefix="/users", tags=["User"])

REFRESH_TOKEN_EXPIRED_DETAIL = "refresh_token_expired"

@router.get("/me", response_model=UserRead)
async def get_user(
    user_id: int = Depends(get_user_id), db: AsyncSession = Depends(get_db)
):
    return await UserService.get_user(db, user_id)

@router.put("/me", response_model=UserRead)
async def update_me(
    update: UserUpdate,
    response: Response,
    user_id: int = Depends(get_user_id),
    db: AsyncSession = Depends(get_db),
):
    password_changed = update.password is not None
    updated_user = await UserService.update_user(db, user_id, update)
    if password_changed:
        clear_auth_cookies(response)
    return updated_user

@router.get("/stats", response_model=UserStats)
async def get_my_stats(
    user_id: int = Depends(get_user_id), db: AsyncSession = Depends(get_db)
):
    return await UserService.get_stats(db, user_id)

@router.get("/activity", response_model=list[UserActivity])
async def get_my_activity(
    user_id: int = Depends(get_user_id), db: AsyncSession = Depends(get_db)
):
    return await UserService.get_activity(db, user_id)

@router.get("/content-status", response_model=list[UserHiddenContent])
async def get_my_content_status(
    user_id: int = Depends(get_user_id), db: AsyncSession = Depends(get_db)
):
    return await UserService.get_hidden_content(db, user_id)

@router.post("/signup", response_model=UserRead)
async def signup(user: UserCreate, db: AsyncSession = Depends(get_db)):
    db_user = await UserService.signup(db, user)
    return db_user

@router.post("/login", response_model=UserRead)
async def login(user: UserLogin,response: Response, db: AsyncSession = Depends(get_db)):
    result = await UserService.login(db, user)
    db_user, access_token, refresh_token = result
    set_auth_cookies(response, access_token, refresh_token)
    return db_user

@router.post("/logout", response_model=bool)
async def logout(
    response: Response,
    user_id: int = Depends(get_user_id),
    db: AsyncSession = Depends(get_db),
):
    clear_auth_cookies(response)

    await UserCrud.update_refresh_token_by_id(db, user_id, None)
    await db.commit()
    return True


@router.post("/refresh", response_model=UserRead)
async def refresh_token(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token missing")

    try:
        user_id = verify_token(refresh_token)
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail=REFRESH_TOKEN_EXPIRED_DETAIL)
    except InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user = await UserCrud.get_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.refresh_token != refresh_token:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    new_access = create_access_token(user_id)
    new_refresh = create_refresh_token(user_id)

    try:
        await UserCrud.update_refresh_token_by_id(db, user_id, new_refresh)
        await db.commit()
    except Exception:
        await db.rollback()
        raise

    set_auth_cookies(response, new_access, new_refresh)
    return await UserService.get_user(db, user_id)
