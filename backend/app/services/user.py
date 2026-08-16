import asyncio
from datetime import datetime

from email_validator import EmailNotValidError, validate_email
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.jwt_handler import (
    create_access_token,
    create_refresh_token,
    get_password_hash,
    verify_password,
)
from app.db.crud import CommentCrud, LikeCrud, TopicCrud, UserCrud, VoteCrud
from app.db.models import User
from app.db.schemas.users import (
    UserActivity,
    UserCreate,
    UserHiddenContent,
    UserLogin,
    UserRead,
    UserStats,
    UserUpdate,
)
from app.db.schemas.pagination import PaginatedResponse

EMAIL_VALIDATION_TIMEOUT_SECONDS = 3.0


class UserService:
    _USERNAME_TAKEN_MESSAGE = "이미 사용 중인 이름입니다."
    _EMAIL_TAKEN_MESSAGE = "이미 사용 중인 이메일입니다."

    _DISPOSABLE_DOMAINS = {
        "mailinator.com",
        "tempmail.com",
        "10minutemail.com",
        "guerrillamail.com",
        "throwawaymail.com",
        "trashmail.com",
        "yopmail.com",
    }

    @staticmethod
    async def _validate_email(email: str) -> str:
        """
        Validate email format and deliverability (MX) and block disposable domains.
        Returns the normalized email or raises HTTPException.
        """
        try:
            v = await asyncio.wait_for(
                asyncio.to_thread(
                    validate_email,
                    email,
                    check_deliverability=True,
                ),
                timeout=EMAIL_VALIDATION_TIMEOUT_SECONDS,
            )
            normalized = v.email
        except TimeoutError:
            raise HTTPException(
                status_code=503,
                detail="이메일 확인 서비스 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.",
            )
        except EmailNotValidError:
            raise HTTPException(status_code=400, detail="유효한 이메일을 입력해 주세요.")

        domain = normalized.split("@")[-1].lower()
        if domain in UserService._DISPOSABLE_DOMAINS:
            raise HTTPException(status_code=400, detail="일회용 이메일은 사용할 수 없습니다.")
        return normalized

    @staticmethod
    async def get_user(db: AsyncSession, user_id: int) -> UserRead:
        db_user = await UserCrud.get_by_id(db, user_id)
        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")
        return await UserService._build_user_read(db, db_user)

    @staticmethod
    async def get_all_for_admin(
        db: AsyncSession,
        *,
        search: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> PaginatedResponse[UserRead]:
        users, total = await UserCrud.get_all_for_admin(
            db, search=search, limit=limit, offset=offset
        )
        items = [await UserService._build_user_read(db, user) for user in users]
        return PaginatedResponse(items=items, total=total, limit=limit, offset=offset)

    @staticmethod
    async def signup(db: AsyncSession, user: UserCreate) -> UserRead:
        user.email = await UserService._validate_email(user.email)

        if await UserCrud.get_by_normalized_username(db, user.username):
            raise HTTPException(status_code=400, detail=UserService._USERNAME_TAKEN_MESSAGE)
        if await UserCrud.get_by_email(db, user.email):
            raise HTTPException(status_code=400, detail=UserService._EMAIL_TAKEN_MESSAGE)

        user.password = await get_password_hash(user.password)

        try:
            db_user = await UserCrud.create(db, user)
            await db.commit()
            await db.refresh(db_user)
            return await UserService._build_user_read(db, db_user)
        except IntegrityError:
            await db.rollback()
            raise HTTPException(status_code=400, detail=UserService._USERNAME_TAKEN_MESSAGE)
        except Exception:
            await db.rollback()
            raise HTTPException(status_code=500, detail="회원가입 처리 중 오류가 발생했습니다.")

    @staticmethod
    async def login(db: AsyncSession, user: UserLogin) -> tuple:
        db_user = await UserCrud.get_by_email(db, user.email)
        if not db_user or not await verify_password(user.password, db_user.password):
            raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 올바르지 않습니다.")

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
        password_changed = update.password is not None

        if update.email:
            update.email = await UserService._validate_email(update.email)
            existing_email = await UserCrud.get_by_email(db, update.email)
            if existing_email and existing_email.user_id != user_id:
                raise HTTPException(status_code=400, detail=UserService._EMAIL_TAKEN_MESSAGE)

        if update.username:
            existing_username = await UserCrud.get_by_normalized_username(db, update.username)
            if existing_username and existing_username.user_id != user_id:
                raise HTTPException(status_code=400, detail=UserService._USERNAME_TAKEN_MESSAGE)

        if update.password:
            update.password = await get_password_hash(update.password)

        try:
            db_user = await UserCrud.update_by_id(db, user_id, update)
            if not db_user:
                raise HTTPException(status_code=404, detail="User not found")
            if password_changed:
                db_user.refresh_token = None
            await db.commit()
            await db.refresh(db_user)
            return await UserService._build_user_read(db, db_user)
        except HTTPException:
            raise
        except IntegrityError:
            await db.rollback()
            raise HTTPException(status_code=400, detail=UserService._USERNAME_TAKEN_MESSAGE)

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
            UserActivity(
                topic_id=topic.topic_id,
                type="topic",
                title=topic.title,
                created_at=topic.created_at,
            )
            for topic in topics
        ]

    @staticmethod
    async def get_hidden_content(db: AsyncSession, user_id: int) -> list[UserHiddenContent]:
        hidden_topics = await TopicCrud.get_hidden_by_user_id(db, user_id)
        hidden_comments = await CommentCrud.get_hidden_by_user_id(db, user_id)

        items = [
            UserHiddenContent(
                type="topic",
                item_id=topic.topic_id,
                topic_id=topic.topic_id,
                title=topic.title,
                content=topic.description,
                hidden_at=topic.hidden_at,
            )
            for topic in hidden_topics
        ]

        items.extend(
            UserHiddenContent(
                type="comment",
                item_id=comment.comment_id,
                topic_id=comment.topic_id,
                title=topic_title,
                content=comment.content,
                hidden_at=comment.hidden_at,
            )
            for comment, topic_title in hidden_comments
        )

        return sorted(
            items,
            key=lambda item: item.hidden_at or datetime.min,
            reverse=True,
        )

    @staticmethod
    async def _build_user_read(db: AsyncSession, user: User) -> UserRead:
        return UserRead(
            user_id=user.user_id,
            username=user.username,
            email=user.email,
            is_admin=user.is_admin,
            created_at=user.created_at,
        )
