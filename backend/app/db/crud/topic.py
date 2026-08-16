from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import case, desc, false, func, or_, select
from sqlalchemy.orm import selectinload
from app.db.models import Topic, TopicLike, Vote
from app.db.schemas.topics import TopicCreate

class TopicCrud:
    @staticmethod
    def _active_topic_filter(now: datetime):
        return or_(Topic.expires_at.is_(None), Topic.expires_at > now)

    @staticmethod
    def _closed_topic_filter(now: datetime):
        return Topic.expires_at <= now

    @staticmethod
    def _active_rank_expression(now: datetime):
        return case((TopicCrud._active_topic_filter(now), 1), else_=0)

    @staticmethod
    def _user_voted_topic_filter(user_id: int):
        return Topic.topic_id.in_(select(Vote.topic_id).where(Vote.user_id == user_id))

    @staticmethod
    async def create(db: AsyncSession, topic_data: TopicCreate, user_id:int) -> Topic:
        topic_dict = topic_data.model_dump()
        topic_dict["user_id"] = user_id
        new_topic = Topic(**topic_dict)
        db.add(new_topic)
        await db.flush()
        return new_topic
    
    @staticmethod
    async def get_by_id(db:AsyncSession, topic_id: int) -> Topic | None:
        return await db.get(Topic, topic_id)

    @staticmethod
    async def get_public_by_id(db: AsyncSession, topic_id: int) -> Topic | None:
        result = await db.execute(
            select(Topic)
            .options(selectinload(Topic.user))
            .where(Topic.topic_id == topic_id, Topic.is_hidden.is_(False))
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def delete_by_id(db:AsyncSession, topic_id:int) -> bool:
        topic = await db.get(Topic, topic_id)
        if topic:
            await db.delete(topic)
            await db.flush()
            return True
        return False
    
    @staticmethod
    async def count_by_user_id(db:AsyncSession, user_id:int) -> int:
        result = await db.execute(select(func.count()).where(Topic.user_id == user_id))
        return result.scalar() or 0

    @staticmethod
    async def get_recent_by_user_id(db: AsyncSession, user_id: int, limit: int = 5):
        result = await db.execute(
            select(Topic)
            .where(Topic.user_id == user_id)
            .order_by(desc(Topic.created_at))
            .limit(limit)
        )
        return result.scalars().all()

    @staticmethod
    async def get_hidden_by_user_id(db: AsyncSession, user_id: int) -> list[Topic]:
        result = await db.execute(
            select(Topic)
            .where(Topic.user_id == user_id, Topic.is_hidden.is_(True))
            .order_by(desc(Topic.hidden_at), desc(Topic.topic_id))
        )
        return list(result.scalars().all())
    
    @staticmethod
    async def get_all_with_filters(
        db:AsyncSession,
        search: str | None = None,
        category: str | None = None,
        sort: str = "created_at",
        status: str = "active",
        limit: int = 10,
        offset: int = 0,
        user_id: int | None = None,
    ):
        now = datetime.now(timezone.utc)
        like_count_subq = (
            select(func.count(TopicLike.like_id))
            .where(TopicLike.topic_id == Topic.topic_id)
            .scalar_subquery()
        )

        base_query = (
            select(Topic)
            .options(selectinload(Topic.user))
            .where(Topic.is_hidden.is_(False))
        )

        if search:
            base_query = base_query.where(
                or_(
                    Topic.title.ilike(f"%{search}%"),
                    Topic.description.ilike(f"%{search}%"),
                )
            )

        if category:
            base_query = base_query.where(Topic.category == category)

        if status == "active":
            base_query = base_query.where(TopicCrud._active_topic_filter(now))
            if user_id is not None:
                base_query = base_query.where(~TopicCrud._user_voted_topic_filter(user_id))
        elif status == "closed":
            base_query = base_query.where(TopicCrud._closed_topic_filter(now))
        elif status == "voted":
            base_query = base_query.where(
                TopicCrud._user_voted_topic_filter(user_id) if user_id is not None else false()
            )

        if status == "all":
            base_query = base_query.order_by(
                desc(TopicCrud._active_rank_expression(now))
            )

        if sort == "like_count":
            base_query = base_query.order_by(desc(like_count_subq), desc(Topic.created_at))
        else:
            base_query = base_query.order_by(desc(Topic.created_at))

        base_query = base_query.limit(limit).offset(offset)
        result = await db.execute(base_query)
        return result.scalars().all()
    
    @staticmethod
    async def count_all_with_filters(
        db: AsyncSession,
        category: str | None = None,
        search: str | None = None,
        status: str = "active",
        user_id: int | None = None,
    ) -> int:
        now = datetime.now(timezone.utc)
        base_query = (
            select(func.count()).select_from(Topic).where(Topic.is_hidden.is_(False))
        )

        if category:
            base_query = base_query.where(Topic.category == category)

        if search:
            base_query = base_query.where(
                (Topic.title.ilike(f"%{search}%"))
                | (Topic.description.ilike(f"%{search}%"))
            )

        if status == "active":
            base_query = base_query.where(TopicCrud._active_topic_filter(now))
            if user_id is not None:
                base_query = base_query.where(~TopicCrud._user_voted_topic_filter(user_id))
        elif status == "closed":
            base_query = base_query.where(TopicCrud._closed_topic_filter(now))
        elif status == "voted":
            base_query = base_query.where(
                TopicCrud._user_voted_topic_filter(user_id) if user_id is not None else false()
            )

        result = await db.execute(base_query)
        return result.scalar() or 0

    @staticmethod
    async def get_all_for_admin(
        db: AsyncSession,
        *,
        status: str | None = None,
        start_at: datetime | None = None,
        end_at: datetime | None = None,
        search: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[Topic], int]:
        now = datetime.now(timezone.utc)
        filters = []
        if status == "active":
            filters.append(TopicCrud._active_topic_filter(now))
        elif status == "closed":
            filters.append(TopicCrud._closed_topic_filter(now))
        if start_at:
            filters.append(Topic.created_at >= start_at)
        if end_at:
            filters.append(Topic.created_at < end_at)
        if search:
            pattern = f"%{search.strip()}%"
            filters.append(or_(Topic.title.ilike(pattern), Topic.description.ilike(pattern)))

        total_result = await db.execute(
            select(func.count()).select_from(Topic).where(*filters)
        )
        query = select(Topic).where(*filters)
        if status == "all":
            query = query.order_by(desc(TopicCrud._active_rank_expression(now)))
        query = (
            query.order_by(desc(Topic.created_at), desc(Topic.topic_id))
            .limit(limit)
            .offset(offset)
        )
        result = await db.execute(query)
        return list(result.scalars().all()), total_result.scalar() or 0

    @staticmethod
    async def get_closed_without_notifications(
        db: AsyncSession,
        *,
        now: datetime | None = None,
        limit: int = 100,
    ) -> list[Topic]:
        current_time = now or datetime.now(timezone.utc)
        result = await db.execute(
            select(Topic)
            .where(
                Topic.is_hidden.is_(False),
                Topic.expires_at.is_not(None),
                Topic.expires_at <= current_time,
                Topic.closed_notified_at.is_(None),
            )
            .order_by(Topic.expires_at, Topic.topic_id)
            .limit(limit)
        )
        return list(result.scalars().all())

    @staticmethod
    async def mark_closed_notified(
        db: AsyncSession,
        topic: Topic,
        *,
        notified_at: datetime | None = None,
    ) -> Topic:
        topic.closed_notified_at = notified_at or datetime.now(timezone.utc)
        await db.flush()
        return topic

    @staticmethod
    async def hide(
        db: AsyncSession,
        topic: Topic,
        admin_user_id: int,
    ) -> Topic:
        topic.is_hidden = True
        topic.hidden_at = datetime.now(timezone.utc)
        topic.hidden_by = admin_user_id
        await db.flush()
        return topic

    @staticmethod
    async def unhide(db: AsyncSession, topic: Topic) -> Topic:
        topic.is_hidden = False
        topic.hidden_at = None
        topic.hidden_by = None
        await db.flush()
        return topic
