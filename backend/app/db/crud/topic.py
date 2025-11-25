from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, or_, desc
from app.db.models import Topic
from app.db.schemas.topics import TopicCreate

class TopicCrud:

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
    async def get_all_with_filters(
        db:AsyncSession,
        search: str | None = None,
        category: str | None = None,
        sort: str = "created_at",
        limit: int = 10,
        offset: int = 0
    ):
        base_query = select(Topic)


        if search:
            base_query = base_query.where(or_(
                Topic.title.ilike(f"%{search}%"),
                Topic.desciption.ilike(f"%{search}%")
            ))

        if category:
            base_query = base_query.where(Topic.category == category)

        if sort == "created_at":
            base_query = base_query.order_by(desc(Topic.created_at))
        
        base_query = base_query.limit(limit).offset(offset)
        result = await db.execute(base_query)
        return result.scalars().all()
    
    @staticmethod
    async def count_all_with_filters(
        db: AsyncSession, category: str | None = None, search: str | None = None
    ) -> int:
        base_query = select(func.count()).select_from(Topic)

        if category:
            base_query = base_query.where(Topic.category == category)

        if search:
            base_query = base_query.where(
                (Topic.title.ilike(f"%{search}%"))
                | (Topic.desciption.ilike(f"%{search}%"))
            )

        result = await db.execute(base_query)
        return result.scalar() or 0
