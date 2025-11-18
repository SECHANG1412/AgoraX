from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.models import Vote
from app.db.schemas.votes import VoteCreate


class VoteCrud:
    @staticmethod
    async def create(db: AsyncSession, vote_data: VoteCreate, user_id: int):
        vote = Vote(user_id=user_id, **vote_data.model_dump())
        db.add(vote)
        await db.flush()
        return vote

    @staticmethod
    async def get_all_by_topic_id(db: AsyncSession, topic_id: int):
        result = await db.execute(select(Vote).filter(Vote.topic_id == topic_id))
        return result.scalars().all()

    @staticmethod
    async def get_all_by_user_id(db: AsyncSession, user_id: int):
        result = await db.execute(select(Vote).filter(Vote.user_id == user_id))
        return result.scalars().all()

    @staticmethod
    async def get_by_topic_and_user(db: AsyncSession, topic_id: int, user_id: int):
        result = await db.execute(
            select(Vote).filter((Vote.topic_id == topic_id) & (Vote.user_id == user_id))
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_all_by_topic_id_and_range(
        db: AsyncSession,
        topic_id: int,
        delta: timedelta,
        order_by_created: bool = True
    ) -> list[Vote]:
        now = datetime.now(timezone.utc)
        start_time = now - delta

        base_query = select(Vote).where(
            Vote.created_at.between(start_time, now),
            Vote.topic_id == topic_id
        )

        if order_by_created:
            base_query = base_query.order_by(Vote.created_at)

        result = await db.execute(base_query)
        return result.scalars().all()