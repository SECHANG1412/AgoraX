from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.crud import (
    CommentCrud,
    LikeCrud,
    PinnedTopicCrud,
    ReplyCrud,
    TopicCrud,
    UserCrud,
    VoteCrud,
)
from app.db.schemas.admin import AdminDeleteResponse
from app.db.schemas.pagination import PaginatedResponse
from app.db.models import Topic
from app.db.schemas.topics import (
    TopicAdminRead,
    TopicCreate,
    TopicModerationUpdate,
    TopicRead,
)
from app.services.admin_action_log import AdminActionLogService
from app.services.notification import NotificationService


class TopicService:
    @staticmethod
    async def get_public_topic(db: AsyncSession, topic_id: int) -> Topic:
        topic = await TopicCrud.get_public_by_id(db, topic_id)
        if not topic:
            raise HTTPException(status_code=404, detail="Topic not found")
        return topic

    @staticmethod
    def is_closed(topic: Topic, now: datetime | None = None) -> bool:
        if topic.expires_at is None:
            return False

        current_time = now or datetime.now(timezone.utc)
        expires_at = topic.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        else:
            expires_at = expires_at.astimezone(timezone.utc)

        return expires_at <= current_time

    @staticmethod
    async def create(db: AsyncSession, user_id: int, topic_data: TopicCreate) -> TopicRead:
        try:
            db_topic = await TopicCrud.create(db, topic_data, user_id)
            await db.commit()
            await db.refresh(db_topic)
            public_topic = await TopicCrud.get_public_by_id(db, db_topic.topic_id)
            return await TopicService._build_topic_read(db, public_topic, user_id)
        except Exception:
            await db.rollback()
            raise

    @staticmethod
    async def get_by_id(
        db: AsyncSession, topic_id: int, user_id: int | None
    ) -> TopicRead | None:
        db_topic = await TopicService.get_public_topic(db, topic_id)
        return await TopicService._build_topic_read(db, db_topic, user_id)

    @staticmethod
    async def get_all(
        db: AsyncSession,
        search: str | None = None,
        category: str | None = None,
        sort: str = "created_at",
        status: str = "active",
        limit: int = 10,
        offset: int = 0,
        user_id: int | None = None,
    ) -> list[TopicRead]:
        db_topics = await TopicCrud.get_all_with_filters(
            db, search, category, sort, status, limit, offset, user_id
        )
        topic_ids = [topic.topic_id for topic in db_topics]
        pinned_map: dict[int, int] = {}
        pinned_topic_ids: set[int] = set()
        if user_id is not None:
            pinned = await PinnedTopicCrud.list_by_user(db, user_id)
            pinned_map = {p.topic_id: idx for idx, p in enumerate(pinned)}
            pinned_topic_ids = {p.topic_id for p in pinned}
        vote_counts_by_topic = await VoteCrud.get_vote_counts_by_topic_ids(db, topic_ids)
        like_counts = await LikeCrud.count_topic_likes_by_topic_ids(db, topic_ids)
        comment_counts = await CommentCrud.count_active_by_topic_ids(db, topic_ids)
        reply_counts = await ReplyCrud.count_by_topic_ids(db, topic_ids)

        topic_reads = [
            await TopicService._build_topic_read(
                db,
                db_topic,
                user_id,
                vote_counts=vote_counts_by_topic.get(db_topic.topic_id, {}),
                like_count=like_counts.get(db_topic.topic_id, 0),
                comment_count=comment_counts.get(db_topic.topic_id, 0),
                reply_count=reply_counts.get(db_topic.topic_id, 0),
                is_pinned=db_topic.topic_id in pinned_topic_ids,
            )
            for db_topic in db_topics
        ]

        if pinned_map:
            topic_reads.sort(key=lambda t: pinned_map.get(t.topic_id, 10**9))

        return topic_reads

    @staticmethod
    async def count_total(
        db: AsyncSession,
        category: str | None,
        search: str | None,
        status: str,
        user_id: int | None = None,
    ) -> int:
        return await TopicCrud.count_all_with_filters(db, category, search, status, user_id)

    @staticmethod
    async def get_all_for_admin(
        db: AsyncSession,
        *,
        status: str | None = None,
        start_at=None,
        end_at=None,
        search: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> PaginatedResponse[TopicAdminRead]:
        topics, total = await TopicCrud.get_all_for_admin(
            db,
            status=status,
            start_at=start_at,
            end_at=end_at,
            search=search,
            limit=limit,
            offset=offset,
        )
        items = [
            TopicAdminRead.model_validate(
                {
                    **topic.__dict__,
                    "is_closed": TopicService.is_closed(topic),
                }
            )
            for topic in topics
        ]
        return PaginatedResponse(items=items, total=total, limit=limit, offset=offset)

    @staticmethod
    async def delete_for_admin(
        db: AsyncSession,
        topic_id: int,
        update: TopicModerationUpdate,
        admin_user_id: int,
        *,
        commit: bool = True,
    ) -> AdminDeleteResponse:
        topic = await TopicCrud.get_by_id(db, topic_id)
        if not topic:
            raise HTTPException(status_code=404, detail="Topic not found")

        author = await UserCrud.get_by_id(db, topic.user_id)
        snapshot = {
            "title": topic.title,
            "description": topic.description,
            "category": topic.category,
            "vote_options": topic.vote_options,
            "author_id": topic.user_id,
            "author_name": author.username if author else None,
            "created_at": topic.created_at.isoformat(),
        }
        try:
            await PinnedTopicCrud.unpin_by_topic(db, topic_id)
            await AdminActionLogService.record(
                db,
                admin_user_id=admin_user_id,
                action="DELETE_TOPIC",
                target_type="Topic",
                target_id=topic_id,
                before_value=snapshot,
                after_value={"deleted": True},
                reason=update.reason,
            )
            await NotificationService.create_if_not_self(
                db,
                user_id=topic.user_id,
                type="content_moderation",
                actor_user_id=admin_user_id,
                target_type="Topic",
                target_id=topic_id,
                topic_id=topic_id,
                message="작성한 토픽이 관리자에 의해 삭제되었습니다.",
                link="/profile",
            )
            deleted = await TopicCrud.delete_by_id(db, topic_id)
            if commit:
                await db.commit()
            else:
                await db.flush()
            return AdminDeleteResponse(deleted=deleted)
        except Exception:
            await db.rollback()
            raise

    @staticmethod
    async def delete(db: AsyncSession, topic_id: int, user_id: int) -> bool:
        topic = await TopicCrud.get_by_id(db, topic_id)
        if not topic:
            raise HTTPException(status_code=404, detail="Topic not found")
        if topic.user_id != user_id:
            raise HTTPException(status_code=403, detail="Not your topic")
        try:
            await PinnedTopicCrud.unpin_by_topic(db, topic_id)
            deleted = await TopicCrud.delete_by_id(db, topic_id)
            await db.commit()
            return deleted
        except Exception:
            await db.rollback()
            raise

    @staticmethod
    async def _build_topic_read(
        db: AsyncSession,
        topic: Topic,
        user_id: int | None = None,
        vote_counts: dict[int, int] | None = None,
        like_count: int | None = None,
        comment_count: int | None = None,
        reply_count: int | None = None,
        is_pinned: bool = False,
    ) -> TopicRead:
        if vote_counts is None:
            vote_counts = await VoteCrud.get_vote_counts_by_topic_id(db, topic.topic_id)
        if like_count is None:
            like_count = await LikeCrud.count_topic_likes(db, topic.topic_id)
        if comment_count is None:
            comment_count = await CommentCrud.count_active_by_topic_id(db, topic.topic_id)
        if reply_count is None:
            reply_count = await ReplyCrud.count_by_topic_id(db, topic.topic_id)

        vote_results = [0] * len(topic.vote_options)
        for vote_index, count in vote_counts.items():
            if 0 <= vote_index < len(vote_results):
                vote_results[vote_index] = count

        result = TopicRead(
            **topic.__dict__,
            author_name=topic.user.username if topic.user else None,
            vote_results=vote_results,
            total_vote=sum(vote_counts.values()),
            like_count=like_count,
            comment_count=comment_count + reply_count,
            is_closed=TopicService.is_closed(topic),
        )

        if user_id is not None:
            vote = await VoteCrud.get_by_topic_and_user(db, topic.topic_id, user_id)
            result.has_voted = vote is not None
            result.user_vote_index = vote.vote_index if vote else None
            result.has_liked = await LikeCrud.has_user_liked_topic(
                db, topic.topic_id, user_id
            )

        if user_id is not None:
            result.is_pinned = is_pinned

        return result
