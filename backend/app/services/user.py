from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from app.db.crud import UserCrud, TopicCrud, VoteCrud, LikeCrud
from app.db.models import User
from app.db.schemas.users import (
    UserLogin,
    UserCreate,
    UserRead,
    UserUpdate,
    UserStats,
    UserActivity,
)
from app.core.jwt_handler import (
    create_access_token,
    create_refresh_token,
    get_password_hash,
    verify_password,
)


class UserService:

    @staticmethod
    async def get_user(db: AsyncSession, user_id: int) -> UserRead:
        db_user = await UserCrud.get_by_id(db, user_id)
        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")
        return await UserService._build_user_read(db, db_user)

    @staticmethod
    async def signup(db: AsyncSession, user: UserCreate) -> UserRead:

        # username 중복 확인
        if await UserCrud.get_by_username(db, user.username):
            raise HTTPException(status_code=400, detail="이미 사용 중인 사용자 이름입니다")
        # email 중복 확인
        if await UserCrud.get_by_email(db, user.email):
            raise HTTPException(status_code=400, detail="이미 사용 중인 이메일입니다")

        # 비밀번호 해싱
        user.password = await get_password_hash(user.password)

        try:
            db_user = await UserCrud.create(db, user)
            await db.commit()
            await db.refresh(db_user)
            return await UserService._build_user_read(db, db_user)
        except Exception:
            await db.rollback()
            raise HTTPException(status_code=500, detail="회원가입 중 오류가 발생했습니다.")

    @staticmethod
    async def login(db: AsyncSession, user: UserLogin) -> tuple:
        db_user = await UserCrud.get_by_email(db, user.email)
        if not db_user or not await verify_password(user.password, db_user.password):
            raise HTTPException(status_code=401, detail="잘못된 이메일 또는 비밀번호")

        refresh_token = create_refresh_token(db_user.user_id)
        access_token = create_access_token(db_user.user_id)

        updated_user = await UserCrud.update_refresh_token_by_id(
            db, db_user.user_id, refresh_token
        )
        await db.commit()
        await db.refresh(updated_user)

        return await UserService._build_user_read(db, updated_user), access_token, refresh_token

    @staticmethod
    async def update_user(db: AsyncSession, user_id: int, update: UserUpdate) -> UserRead:
        if update.email:
            existing_email = await UserCrud.get_by_email(db, update.email)
            if existing_email and existing_email.user_id != user_id:
                raise HTTPException(status_code=400, detail="이미 사용 중인 이메일입니다")
        if update.username:
            existing_username = await UserCrud.get_by_username(db, update.username)
            if existing_username and existing_username.user_id != user_id:
                raise HTTPException(status_code=400, detail="이미 사용 중인 사용자 이름입니다")

        db_user = await UserCrud.update_by_id(db, user_id, update)
        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")
        await db.commit()
        await db.refresh(db_user)
        return await UserService._build_user_read(db, db_user)

    @staticmethod
    async def get_stats(db: AsyncSession, user_id: int) -> UserStats:
        topics = await TopicCrud.count_by_user_id(db, user_id)
        votes = await VoteCrud.count_by_user_id(db, user_id)
        likes = await LikeCrud.count_likes_received(db, user_id)
        return UserStats(topics=topics, votes=votes, likes=likes)

    @staticmethod
    async def get_activity(db: AsyncSession, user_id: int) -> list[UserActivity]:
        topics = await TopicCrud.get_recent_by_user_id(db, user_id, limit=5)
        return [
            UserActivity(type="topic", title=topic.title, created_at=topic.created_at)
            for topic in topics
        ]

    @staticmethod
    async def _build_user_read(db: AsyncSession, user: User) -> UserRead:
        return UserRead(
            user_id=user.user_id,
            username=user.username,
            email=user.email,
            created_at=user.created_at,
        )
