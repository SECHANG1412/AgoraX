from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.models import Comment
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
        result = await db.execute(select(Comment).filter(Comment.topic_id == topic_id))
        return result.scalars().all()

    @staticmethod
    async def delete_by_id(db: AsyncSession, comment_id: int):
        comment = await db.get(Comment, comment_id)
        if comment:
            await db.delete(comment)
            await db.flush()
        return comment
