from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from app.db.models import Reply, Comment
from app.db.schemas.replys import ReplyCreate, ReplyUpdate


class ReplyCrud:
    @staticmethod
    async def get_by_id(db: AsyncSession, reply_id: int):
        return await db.get(Reply, reply_id)

    @staticmethod
    async def create(db: AsyncSession, reply_data: ReplyCreate, user_id: int):
        reply = Reply(user_id=user_id, **reply_data.model_dump())
        db.add(reply)
        await db.flush()
        return reply

    @staticmethod
    async def update_by_id(db: AsyncSession, reply_id: int, reply_data: ReplyUpdate):
        reply = await db.get(Reply, reply_id)
        if reply:
            for key, value in reply_data.model_dump().items():
                setattr(reply, key, value)
            await db.flush()
        return reply

    @staticmethod
    async def get_all_by_comment_id(db: AsyncSession, comment_id: int):
        result = await db.execute(select(Reply).filter(Reply.comment_id == comment_id))
        return result.scalars().all()

    @staticmethod
    async def count_by_comment_id(db: AsyncSession, comment_id: int) -> int:
        result = await db.execute(select(func.count(Reply.reply_id)).where(Reply.comment_id == comment_id))
        return result.scalar_one() or 0

    @staticmethod
    async def count_by_topic_id(db: AsyncSession, topic_id: int) -> int:
        result = await db.execute(
            select(func.count(Reply.reply_id)).join(Comment, Reply.comment_id == Comment.comment_id).where(
                Comment.topic_id == topic_id
            )
        )
        return result.scalar_one() or 0

    @staticmethod
    async def delete_by_id(db: AsyncSession, reply_id: int):
        reply = await db.get(Reply, reply_id)
        if reply:
            await db.delete(reply)
            await db.flush()
        return reply
