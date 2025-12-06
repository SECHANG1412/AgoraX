from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from app.db.crud import CommentCrud, UserCrud, LikeCrud, TopicCrud, ReplyCrud
from app.db.models import Comment
from app.db.schemas.comments import CommentRead, CommentCreate, CommentUpdate
from app.services.reply import ReplyService

class CommentService:

    @staticmethod
    async def create(db: AsyncSession, user_id: int, comment_data: CommentCreate) -> CommentRead:
        topic = await TopicCrud.get_by_id(db, comment_data.topic_id)
        if not topic:
            raise HTTPException(status_code=404, detail="Topic not found")
        try:
            comment = await CommentCrud.create(db, comment_data, user_id)
            await db.commit()
            await db.refresh(comment)
            return await CommentService._build_comment_read(db, comment, user_id)
        except Exception:
            await db.rollback()
            raise

    
    @staticmethod
    async def update_by_id(db: AsyncSession, comment_id: int, comment_data: CommentUpdate, user_id: int) -> CommentRead:
        comment = await CommentCrud.get_by_id(db, comment_id)
        if not comment:
            raise HTTPException(status_code=404, detail="Comment not found")
        if comment.user_id != user_id:
            raise HTTPException(status_code=403, detail="Not your comment")
        try:
            updated_comment = await CommentCrud.update_by_id(db, comment_id, comment_data)
            await db.commit()
            await db.refresh(updated_comment)
            return await CommentService._build_comment_read(db,updated_comment, user_id)
        except Exception:
            await db.rollback()
            raise

    
    @staticmethod
    async def delete_by_id(db: AsyncSession, comment_id: int, user_id: int) -> CommentRead:
        comment = await CommentCrud.get_by_id(db, comment_id)
        if not comment:
            raise HTTPException(status_code=404, detail="Comment not found")
        if comment.user_id != user_id:
            raise HTTPException(status_code=403, detail="Not your comment")
        try:
            replies = await ReplyCrud.get_all_by_comment_id(db, comment_id)

            if replies:
                # Has replies: soft delete to preserve thread context.
                await LikeCrud.delete_comment_likes_by_comment_id(db, comment_id)
                comment.content = "삭제된 댓글입니다."
                comment.is_deleted = True
                await db.flush()
                await db.commit()
                await db.refresh(comment)
                return await CommentService._build_comment_read(db, comment, user_id)
            else:
                # No replies: hard delete with related likes.
                await LikeCrud.delete_comment_likes_by_comment_id(db, comment_id)
                deleted = await CommentCrud.delete_by_id(db, comment_id)
                await db.commit()
                return await CommentService._build_comment_read(db, deleted, user_id)
        except Exception:
            await db.rollback()
            raise

    
    @staticmethod
    async def get_all_by_topic_id(db: AsyncSession, topic_id: int, user_id: int | None = None) -> list[CommentRead]:
        comments = await CommentCrud.get_all_by_topic_id(db, topic_id)
        return [await CommentService._build_comment_read(db, comment, user_id) for comment in comments]


    @staticmethod
    async def _build_comment_read(
        db: AsyncSession, comment: Comment, user_id: int | None = None
    ) -> CommentRead:
        user = await UserCrud.get_by_id(db=db, user_id=comment.user_id)
        replies = await ReplyService.get_all_by_comment_id(
            db, comment.comment_id, user_id
        )
        like_count = await LikeCrud.count_comment_likes(db, comment.comment_id)
        has_liked = await LikeCrud.has_user_liked_comment(db, comment.comment_id, user_id) if user_id else False

        return CommentRead(
            comment_id=comment.comment_id,
            user_id=comment.user_id,
            topic_id=comment.topic_id,
            content=comment.content,
            is_deleted=comment.is_deleted,
            created_at=comment.created_at,
            username=user.username,
            replies=replies,
            like_count=like_count,
            has_liked=has_liked,
        )
