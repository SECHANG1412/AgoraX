from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import desc, func, or_, select
from app.db.models import User
from app.db.models.user import normalize_username
from app.db.schemas.users import UserCreate, UserUpdate

class UserCrud:

    @staticmethod
    async def get_by_id(db: AsyncSession, user_id: int) -> User | None:
        result = await db.execute(select(User).filter(User.user_id == user_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_ids(db: AsyncSession, user_ids: list[int]) -> dict[int, User]:
        if not user_ids:
            return {}

        result = await db.execute(select(User).filter(User.user_id.in_(user_ids)))
        return {user.user_id: user for user in result.scalars().all()}

    @staticmethod
    async def get_all_for_admin(
        db: AsyncSession,
        *,
        search: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[User], int]:
        filters = []
        if search:
            pattern = f"%{search.strip()}%"
            filters.append(or_(User.username.ilike(pattern), User.email.ilike(pattern)))

        total_result = await db.execute(
            select(func.count()).select_from(User).where(*filters)
        )
        result = await db.execute(
            select(User)
            .where(*filters)
            .order_by(desc(User.created_at), desc(User.user_id))
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all()), total_result.scalar() or 0
    
    @staticmethod
    async def create(db: AsyncSession, user: UserCreate) -> User:
        db_user = User(**user.model_dump())
        db.add(db_user)
        await db.flush()
        return db_user
    
    @staticmethod
    async def update_by_id(
        db: AsyncSession, user_id: int, user: UserUpdate
    ) -> User | None:
        db_user = await db.get(User, user_id)
        if db_user:
            update_data = user.model_dump(exclude_unset=True)
            for key, value in update_data.items():
                setattr(db_user, key, value)
            await db.flush()
            return db_user
        return None
    
    @staticmethod
    async def delete_by_id(db: AsyncSession, user_id: int) -> User | None:
        db_user = await db.get(User, user_id)
        if db_user:
            await db.delete(db_user)
            await db.flush()
            return db_user
        return None
    
    @staticmethod
    async def get_by_username(db: AsyncSession, username: str) -> User | None:
        result = await db.execute(select(User).filter(User.username == username))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_normalized_username(db: AsyncSession, username: str) -> User | None:
        normalized = normalize_username(username)
        result = await db.execute(
            select(User).filter(User.username_normalized == normalized)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_by_email(db: AsyncSession, email: str) -> User | None:
        result = await db.execute(select(User).filter(User.email == email))
        return result.scalar_one_or_none()
    
    @staticmethod
    async def update_refresh_token_by_id(
        db: AsyncSession, user_id: int, refresh_token: str
    ):
        db_user = await db.get(User, user_id)
        if db_user:
            db_user.refresh_token = refresh_token
            await db.flush()
        return db_user
