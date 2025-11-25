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
)
from app.core.auth import get_user_id, set_auth_cookies

router = APIRouter(prefix="/users", tags=["User"])

@router.get("/me", response_model=UserRead)
async def get_user(
    user_id: int = Depends(get_user_id), db: AsyncSession = Depends(get_db)
):
    return await UserService.get_user(db, user_id)

@router.put("/me", response_model=UserRead)
async def update_me(
    update: UserUpdate,
    user_id: int = Depends(get_user_id),
    db: AsyncSession = Depends(get_db),
):
    return await UserService.update_user(db, user_id, update)

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
async def logout(response: Response):
    response.delete_cookie(key="access_token")
    response.delete_cookie(key="refresh_token")
    return True
