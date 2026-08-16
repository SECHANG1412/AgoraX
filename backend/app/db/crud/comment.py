from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import desc, func, select
from app.db.models import Comment, Topic
from app.db.schemas.comments import CommentCreate, CommentUpdate


class CommentCrud:
    @staticmethod
    async def get_by_id(db: AsyncSession, comment_id: int):
        return await db.get(Comment, comment_id)

    @staticmethod
    async def create(db: AsyncSession, comment_data: CommentCreate, user_id: int):
        comment = Comment(user_id=user_id, **comment_data.model_dump())
        db.add(comment)
        await db.flush()
        return comment

    @staticmethod
    async def update_by_id(
        db: AsyncSession, comment_id: int, comment_data: CommentUpdate
    ):
        comment = await db.get(Comment, comment_id)
        if comment:
            for key, value in comment_data.model_dump().items():
                setattr(comment, key, value)
            await db.flush()
        return comment

    @staticmethod
    async def get_all_by_topic_id(db: AsyncSession, topic_id: int):
        result = await db.execute(
            select(Comment)
            .where(Comment.topic_id == topic_id, Comment.is_hidden.is_(False))
            .order_by(Comment.created_at.asc(), Comment.comment_id.asc())
        )
        return result.scalars().all()

    @staticmethod
    async def count_by_topic_id(db: AsyncSession, topic_id: int) -> int:
        result = await db.execute(select(Comment).filter(Comment.topic_id == topic_id))
        return len(result.scalars().all())

    @staticmethod
    async def count_active_by_topic_id(db: AsyncSession, topic_id: int) -> int:
        result = await db.execute(
            select(func.count())
            .select_from(Comment)
            .where(
                Comment.topic_id == topic_id,
                Comment.is_deleted.is_(False),
                Comment.is_hidden.is_(False),
            )
        )
        return result.scalar() or 0

    @staticmethod
    async def count_active_by_topic_ids(
        db: AsyncSession, topic_ids: list[int]
    ) -> dict[int, int]:
        if not topic_ids:
            return {}

        result = await db.execute(
            select(Comment.topic_id, func.count())
            .select_from(Comment)
            .where(
                Comment.topic_id.in_(topic_ids),
                Comment.is_deleted.is_(False),
                Comment.is_hidden.is_(False),
            )
            .group_by(Comment.topic_id)
        )
        return {topic_id: count for topic_id, count in result.all()}

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
    ) -> tuple[list[Comment], int]:
        filters = []
        if start_at:
            filters.append(Comment.created_at >= start_at)
        if end_at:
            filters.append(Comment.created_at < end_at)
        if search:
            filters.append(Comment.content.ilike(f"%{search.strip()}%"))

        total_result = await db.execute(
            select(func.count()).select_from(Comment).where(*filters)
        )
        query = (
            select(Comment)
            .where(*filters)
            .order_by(desc(Comment.created_at), desc(Comment.comment_id))
            .limit(limit)
            .offset(offset)
        )
        result = await db.execute(query)
        return list(result.scalars().all()), total_result.scalar() or 0

    @staticmethod
    async def get_hidden_by_user_id(db: AsyncSession, user_id: int) -> list[tuple[Comment, str]]:
        result = await db.execute(
            select(Comment, Topic.title)
            .join(Topic, Topic.topic_id == Comment.topic_id)
            .where(Comment.user_id == user_id, Comment.is_hidden.is_(True))
            .order_by(desc(Comment.hidden_at), desc(Comment.comment_id))
        )
        return list(result.all())

    @staticmethod
    async def hide(
        db: AsyncSession,
        comment: Comment,
        admin_user_id: int,
    ) -> Comment:
        comment.is_hidden = True
        comment.hidden_at = datetime.now(timezone.utc)
        comment.hidden_by = admin_user_id
        await db.flush()
        return comment

    @staticmethod
    async def unhide(db: AsyncSession, comment: Comment) -> Comment:
        comment.is_hidden = False
        comment.hidden_at = None
        comment.hidden_by = None
        await db.flush()
        return comment

    @staticmethod
    async def delete_by_id(db: AsyncSession, comment_id: int):
        comment = await db.get(Comment, comment_id)
        if comment:
            await db.delete(comment)
            await db.flush()
        return comment
