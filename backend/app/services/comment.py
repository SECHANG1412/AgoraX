from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.crud import CommentCrud, LikeCrud, ReplyCrud, UserCrud
from app.db.schemas.admin import AdminDeleteResponse
from app.db.models import Comment
from app.db.schemas.comments import (
    CommentCreate,
    CommentModerationUpdate,
    CommentRead,
    CommentUpdate,
)
from app.db.schemas.replys import ReplyRead
from app.services.admin_action_log import AdminActionLogService
from app.services.notification import NotificationService
from app.services.reply import ReplyService
from app.services.topic import TopicService


class CommentService:
    @staticmethod
    async def create(
        db: AsyncSession, user_id: int, comment_data: CommentCreate
    ) -> CommentRead:
        topic = await TopicService.get_public_topic(db, comment_data.topic_id)
        try:
            comment = await CommentCrud.create(db, comment_data, user_id)
            actor = await UserCrud.get_by_id(db, user_id)
            await NotificationService.create_if_not_self(
                db,
                user_id=topic.user_id,
                type="topic_comment",
                actor_user_id=user_id,
                target_type="Comment",
                target_id=comment.comment_id,
                topic_id=topic.topic_id,
                message=f"{actor.username if actor else '누군가'}님이 내 토픽에 댓글을 남겼습니다.",
                link=f"/topic/{topic.topic_id}",
            )
            await db.commit()
            await db.refresh(comment)
            return await CommentService._build_comment_read(db, comment, user_id)
        except Exception:
            await db.rollback()
            raise

    @staticmethod
    async def update_by_id(
        db: AsyncSession, comment_id: int, comment_data: CommentUpdate, user_id: int
    ) -> CommentRead:
        comment = await CommentCrud.get_by_id(db, comment_id)
        if not comment:
            raise HTTPException(status_code=404, detail="Comment not found")
        if comment.user_id != user_id:
            raise HTTPException(status_code=403, detail="Not your comment")
        try:
            updated_comment = await CommentCrud.update_by_id(
                db, comment_id, comment_data
            )
            await db.commit()
            await db.refresh(updated_comment)
            return await CommentService._build_comment_read(
                db, updated_comment, user_id
            )
        except Exception:
            await db.rollback()
            raise

    @staticmethod
    async def delete_by_id(
        db: AsyncSession, comment_id: int, user_id: int
    ) -> CommentRead:
        comment = await CommentCrud.get_by_id(db, comment_id)
        if not comment:
            raise HTTPException(status_code=404, detail="Comment not found")
        if comment.user_id != user_id:
            raise HTTPException(status_code=403, detail="Not your comment")
        try:
            replies = await ReplyCrud.get_all_by_comment_id(db, comment_id)

            if replies:
                await LikeCrud.delete_comment_likes_by_comment_id(db, comment_id)
                comment.content = "삭제된 댓글입니다."
                comment.is_deleted = True
                await db.flush()
                await db.commit()
                await db.refresh(comment)
                return await CommentService._build_comment_read(db, comment, user_id)

            await LikeCrud.delete_comment_likes_by_comment_id(db, comment_id)
            deleted = await CommentCrud.delete_by_id(db, comment_id)
            await db.commit()
            return await CommentService._build_comment_read(db, deleted, user_id)
        except Exception:
            await db.rollback()
            raise

    @staticmethod
    async def get_all_by_topic_id(
        db: AsyncSession, topic_id: int, user_id: int | None = None
    ) -> list[CommentRead]:
        await TopicService.get_public_topic(db, topic_id)
        comments = await CommentCrud.get_all_by_topic_id(db, topic_id)
        comment_ids = [comment.comment_id for comment in comments]
        replies_by_comment_id = await ReplyService.get_all_by_comment_ids(
            db, comment_ids, user_id
        )
        like_counts = await LikeCrud.count_comment_likes_by_comment_ids(
            db, comment_ids
        )
        comment_user_ids = list({comment.user_id for comment in comments})
        comment_users = await UserCrud.get_by_ids(db, comment_user_ids)
        return [
            await CommentService._build_comment_read(
                db,
                comment,
                user_id,
                replies=replies_by_comment_id.get(comment.comment_id, []),
                like_count=like_counts.get(comment.comment_id, 0),
                username=comment_users[comment.user_id].username,
            )
            for comment in comments
        ]

    @staticmethod
    async def get_all_for_admin(
        db: AsyncSession,
        *,
        status: str | None = None,
        start_at=None,
        end_at=None,
    ) -> list[Comment]:
        return await CommentCrud.get_all_for_admin(
            db,
            status=status,
            start_at=start_at,
            end_at=end_at,
        )

    @staticmethod
    async def delete_for_admin(
        db: AsyncSession,
        comment_id: int,
        update: CommentModerationUpdate,
        admin_user_id: int,
        *,
        commit: bool = True,
    ) -> AdminDeleteResponse:
        comment = await CommentCrud.get_by_id(db, comment_id)
        if not comment:
            raise HTTPException(status_code=404, detail="Comment not found")

        author = await UserCrud.get_by_id(db, comment.user_id)
        snapshot = {
            "content": comment.content,
            "author_id": comment.user_id,
            "author_name": author.username if author else None,
            "topic_id": comment.topic_id,
            "is_deleted": comment.is_deleted,
            "created_at": comment.created_at.isoformat(),
        }
        try:
            await AdminActionLogService.record(
                db,
                admin_user_id=admin_user_id,
                action="DELETE_COMMENT",
                target_type="Comment",
                target_id=comment_id,
                before_value=snapshot,
                after_value={"deleted": True},
                reason=update.reason,
            )
            await NotificationService.create_if_not_self(
                db,
                user_id=comment.user_id,
                type="content_moderation",
                actor_user_id=admin_user_id,
                target_type="Comment",
                target_id=comment_id,
                topic_id=comment.topic_id,
                message="작성한 댓글이 관리자에 의해 삭제되었습니다.",
                link="/profile",
            )
            await CommentCrud.delete_by_id(db, comment_id)
            if commit:
                await db.commit()
            else:
                await db.flush()
            return AdminDeleteResponse(deleted=True)
        except Exception:
            await db.rollback()
            raise

    @staticmethod
    async def _build_comment_read(
        db: AsyncSession,
        comment: Comment,
        user_id: int | None = None,
        replies: list[ReplyRead] | None = None,
        like_count: int | None = None,
        username: str | None = None,
    ) -> CommentRead:
        comment_username = username
        if comment_username is None:
            user = await UserCrud.get_by_id(db=db, user_id=comment.user_id)
            comment_username = user.username
        comment_replies = (
            replies
            if replies is not None
            else await ReplyService.get_all_by_comment_id(
                db, comment.comment_id, user_id
            )
        )
        comment_like_count = (
            like_count
            if like_count is not None
            else await LikeCrud.count_comment_likes(db, comment.comment_id)
        )
        has_liked = (
            await LikeCrud.has_user_liked_comment(db, comment.comment_id, user_id)
            if user_id
            else False
        )

        return CommentRead(
            comment_id=comment.comment_id,
            user_id=comment.user_id,
            topic_id=comment.topic_id,
            content=comment.content,
            is_deleted=comment.is_deleted,
            created_at=comment.created_at,
            username=comment_username,
            replies=comment_replies,
            like_count=comment_like_count,
            has_liked=has_liked,
        )
