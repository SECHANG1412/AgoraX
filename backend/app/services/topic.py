from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.crud import TopicCrud, VoteCrud, LikeCrud, PinnedTopicCrud
from app.db.schemas.topics import TopicCreate, TopicRead
from app.db.models import Topic

class TopicService:
    @staticmethod
    async def create(db:AsyncSession, user_id: int, topic_data: TopicCreate) -> Topic:
        try:
            db_topic = await TopicCrud.create(db, topic_data, user_id)
            await db.commit()
            await db.refresh(db_topic)
            return db_topic
        except Exception:
            await db.rollback()
            raise
    
    @staticmethod
    async def get_by_id(db: AsyncSession, topic_id: int, user_id: int | None) -> TopicRead | None:
        db_topic = await TopicCrud.get_by_id(db, topic_id)
        if not db_topic:
            raise HTTPException(status_code=404, detail="Topic not found")
        return await TopicService._build_topic_read(db, db_topic, user_id)
    
    @staticmethod
    async def get_all(
        db:AsyncSession,
        search: str | None = None,
        category: str | None = None,
        sort: str = "created_at",
        limit: int = 10,
        offset: int = 0,
        user_id: int | None = None
    ) -> list[TopicRead]:
        db_topics = await TopicCrud.get_all_with_filters(db,search,category,sort,limit,offset)
        pinned_map: dict[int, int] = {}
        if user_id is not None:
            pinned = await PinnedTopicCrud.list_by_user(db, user_id)
            pinned_map = {p.topic_id: idx for idx, p in enumerate(pinned)}

        topic_reads = [await TopicService._build_topic_read(db, db_topic, user_id) for db_topic in db_topics]

        if pinned_map:
            topic_reads.sort(key=lambda t: pinned_map.get(t.topic_id, 10**9))

        return topic_reads
    
    @staticmethod
    async def count_total(db:AsyncSession, category: str | None, search: str | None) -> int:
        return await TopicCrud.count_all_with_filters(db, category, search)

    @staticmethod
    async def delete(db: AsyncSession, topic_id: int, user_id: int) -> bool:
        topic = await TopicCrud.get_by_id(db, topic_id)
        if not topic:
            raise HTTPException(status_code=404, detail="Topic not found")
        if topic.user_id != user_id:
            raise HTTPException(status_code=403, detail="Not your topic")
        try:
            deleted = await TopicCrud.delete_by_id(db, topic_id)
            await db.commit()
            return deleted
        except Exception:
            await db.rollback()
            raise
    
    @staticmethod
    async def _build_topic_read(db: AsyncSession, topic: Topic, user_id: int | None = None) -> TopicRead:
        
        votes = await VoteCrud.get_all_by_topic_id(db, topic.topic_id)
        like_count = await LikeCrud.count_topic_likes(db, topic.topic_id)

        vote_results = [0] * len(topic.vote_options)
        for vote in votes:
            if 0 <= vote.vote_index < len(vote_results):
                vote_results[vote.vote_index] += 1

        result = TopicRead(
            **topic.__dict__,
            vote_results=vote_results,
            total_vote=len(votes),
            like_count=like_count)

        if user_id is not None:
            vote = await VoteCrud.get_by_topic_and_user(db, topic.topic_id, user_id)
            result.has_voted = vote is not None
            result.user_vote_index = vote.vote_index if vote else None
            result.has_liked = await LikeCrud.has_user_liked_topic(
                db, topic.topic_id, user_id
            )

        if user_id is not None:
            result.is_pinned = await PinnedTopicCrud.is_pinned(db, user_id, topic.topic_id)

        return result
