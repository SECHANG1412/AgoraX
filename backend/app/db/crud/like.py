from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from app.db.models import TopicLike, CommentLike, ReplyLike, Topic, Comment, Reply


class LikeCrud:
    @staticmethod
    async def get_topic_like_by_user_and_topic(
        db: AsyncSession, user_id: int, topic_id: int
    ) -> TopicLike | None:
        result = await db.execute(
            select(TopicLike).where(
                (TopicLike.user_id == user_id) & (TopicLike.topic_id == topic_id)
            )
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def create_topic_like(
        db: AsyncSession, user_id: int, topic_id: int
    ) -> TopicLike:
        like = TopicLike(user_id=user_id, topic_id=topic_id)
        db.add(like)
        await db.flush()
        return like

    @staticmethod
    async def delete_topic_like(db: AsyncSession, like_id: int) -> TopicLike | None:
        like = await db.get(TopicLike, like_id)
        if like:
            await db.delete(like)
            await db.flush()
        return like

    @staticmethod
    async def get_comment_like_by_user_and_comment(
        db: AsyncSession, user_id: int, comment_id: int
    ) -> CommentLike | None:
        result = await db.execute(
            select(CommentLike).where(
                (CommentLike.user_id == user_id)
                & (CommentLike.comment_id == comment_id)
            )
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def create_comment_like(
        db: AsyncSession, user_id: int, comment_id: int
    ) -> CommentLike:
        like = CommentLike(user_id=user_id, comment_id=comment_id)
        db.add(like)
        await db.flush()
        return like

    @staticmethod
    async def delete_comment_like(db: AsyncSession, like_id: int) -> CommentLike | None:
        like = await db.get(CommentLike, like_id)
        if like:
            await db.delete(like)
            await db.flush()
        return like

    @staticmethod
    async def delete_comment_likes_by_comment_id(db: AsyncSession, comment_id: int):
        result = await db.execute(select(CommentLike).where(CommentLike.comment_id == comment_id))
        for like in result.scalars().all():
            await db.delete(like)
        await db.flush()

    @staticmethod
    async def get_reply_like_by_user_and_reply(
        db: AsyncSession, user_id: int, reply_id: int
    ) -> ReplyLike | None:
        result = await db.execute(
            select(ReplyLike).where(
                (ReplyLike.user_id == user_id) & (ReplyLike.reply_id == reply_id)
            )
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def create_reply_like(
        db: AsyncSession, user_id: int, reply_id: int
    ) -> ReplyLike:
        like = ReplyLike(user_id=user_id, reply_id=reply_id)
        db.add(like)
        await db.flush()
        return like

    @staticmethod
    async def delete_reply_like(db: AsyncSession, like_id: int) -> ReplyLike | None:
        like = await db.get(ReplyLike, like_id)
        if like:
            await db.delete(like)
            await db.flush()
        return like

    @staticmethod
    async def delete_reply_likes_by_reply_id(db: AsyncSession, reply_id: int):
        result = await db.execute(select(ReplyLike).where(ReplyLike.reply_id == reply_id))
        for like in result.scalars().all():
            await db.delete(like)
        await db.flush()

    @staticmethod
    async def count_topic_likes(db: AsyncSession, topic_id: int) -> int:
        result = await db.execute(
            select(func.count(TopicLike.like_id)).where(TopicLike.topic_id == topic_id)
        )
        return result.scalar()

    @staticmethod
    async def count_comment_likes(db: AsyncSession, comment_id: int) -> int:
        result = await db.execute(
            select(func.count(CommentLike.like_id)).where(
                CommentLike.comment_id == comment_id
            )
        )
        return result.scalar()

    @staticmethod
    async def count_reply_likes(db: AsyncSession, reply_id: int) -> int:
        result = await db.execute(
            select(func.count(ReplyLike.like_id)).where(ReplyLike.reply_id == reply_id)
        )
        return result.scalar()

    @staticmethod
    async def has_user_liked_topic(
        db: AsyncSession, topic_id: int, user_id: int
    ) -> bool:
        return (
            await LikeCrud.get_topic_like_by_user_and_topic(db, user_id, topic_id)
            is not None
        )

    @staticmethod
    async def has_user_liked_comment(
        db: AsyncSession, comment_id: int, user_id: int
    ) -> bool:
        return (
            await LikeCrud.get_comment_like_by_user_and_comment(db, user_id, comment_id)
            is not None
        )

    @staticmethod
    async def has_user_liked_reply(
        db: AsyncSession, reply_id: int, user_id: int
    ) -> bool:
        return (
            await LikeCrud.get_reply_like_by_user_and_reply(db, user_id, reply_id)
            is not None
        )

    @staticmethod
    async def count_likes_received(db: AsyncSession, user_id: int) -> int:
        topic_likes = (
            select(func.count(TopicLike.like_id))
            .join(Topic, Topic.topic_id == TopicLike.topic_id)
            .where(Topic.user_id == user_id)
        )
        comment_likes = (
            select(func.count(CommentLike.like_id))
            .join(Comment, Comment.comment_id == CommentLike.comment_id)
            .where(Comment.user_id == user_id)
        )
        reply_likes = (
            select(func.count(ReplyLike.like_id))
            .join(Reply, Reply.reply_id == ReplyLike.reply_id)
            .where(Reply.user_id == user_id)
        )

        topic_count = (await db.execute(topic_likes)).scalar() or 0
        comment_count = (await db.execute(comment_likes)).scalar() or 0
        reply_count = (await db.execute(reply_likes)).scalar() or 0
        return topic_count + comment_count + reply_count
