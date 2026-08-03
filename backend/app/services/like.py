from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.crud import LikeCrud, CommentCrud, ReplyCrud, UserCrud
from app.services.notification import NotificationService
from app.services.topic import TopicService


class LikeService:
    @staticmethod
    async def _resolve_duplicate_topic_like(
        db: AsyncSession, user_id: int, topic_id: int
    ) -> bool:
        await db.rollback()
        like = await LikeCrud.get_topic_like_by_user_and_topic(db, user_id, topic_id)
        if like:
            return True
        raise HTTPException(status_code=409, detail="좋아요 처리 중 충돌이 발생했습니다. 다시 시도해주세요.")

    @staticmethod
    async def _resolve_duplicate_comment_like(
        db: AsyncSession, user_id: int, comment_id: int
    ) -> bool:
        await db.rollback()
        like = await LikeCrud.get_comment_like_by_user_and_comment(db, user_id, comment_id)
        if like:
            return True
        raise HTTPException(status_code=409, detail="좋아요 처리 중 충돌이 발생했습니다. 다시 시도해주세요.")

    @staticmethod
    async def _resolve_duplicate_reply_like(
        db: AsyncSession, user_id: int, reply_id: int
    ) -> bool:
        await db.rollback()
        like = await LikeCrud.get_reply_like_by_user_and_reply(db, user_id, reply_id)
        if like:
            return True
        raise HTTPException(status_code=409, detail="좋아요 처리 중 충돌이 발생했습니다. 다시 시도해주세요.")

    @staticmethod
    async def toggle_topic_like(db: AsyncSession, user_id: int, topic_id: int) -> bool:
        try:
            topic = await TopicService.get_public_topic(db, topic_id)

            like = await LikeCrud.get_topic_like_by_user_and_topic(
                db, user_id, topic_id
            )
            if like:
                await LikeCrud.delete_topic_like(db, like.like_id)
                result = False
            else:
                created_like = await LikeCrud.create_topic_like(db, user_id, topic_id)
                actor = await UserCrud.get_by_id(db, user_id)
                await NotificationService.create_if_not_self(
                    db,
                    user_id=topic.user_id,
                    type="topic_like",
                    actor_user_id=user_id,
                    target_type="TopicLike",
                    target_id=created_like.like_id,
                    topic_id=topic.topic_id,
                    message=f"{actor.username if actor else '누군가'}님이 내 토픽을 좋아합니다.",
                    link=f"/topic/{topic.topic_id}",
                )
                result = True
            await db.commit()
            return result
        except IntegrityError:
            return await LikeService._resolve_duplicate_topic_like(db, user_id, topic_id)
        except Exception:
            await db.rollback()
            raise

    @staticmethod
    async def toggle_comment_like(
        db: AsyncSession, user_id: int, comment_id: int
    ) -> bool:
        try:
            comment = await CommentCrud.get_by_id(db, comment_id)
            if not comment or comment.is_hidden:
                raise HTTPException(status_code=404, detail="Comment not found")
            await TopicService.get_public_topic(db, comment.topic_id)

            like = await LikeCrud.get_comment_like_by_user_and_comment(
                db, user_id, comment_id
            )
            if like:
                await LikeCrud.delete_comment_like(db, like.like_id)
                result = False
            else:
                created_like = await LikeCrud.create_comment_like(db, user_id, comment_id)
                actor = await UserCrud.get_by_id(db, user_id)
                await NotificationService.create_if_not_self(
                    db,
                    user_id=comment.user_id,
                    type="comment_like",
                    actor_user_id=user_id,
                    target_type="CommentLike",
                    target_id=created_like.like_id,
                    topic_id=comment.topic_id,
                    message=f"{actor.username if actor else '누군가'}님이 내 댓글을 좋아합니다.",
                    link=f"/topic/{comment.topic_id}",
                )
                result = True
            await db.commit()
            return result
        except IntegrityError:
            return await LikeService._resolve_duplicate_comment_like(db, user_id, comment_id)
        except Exception:
            await db.rollback()
            raise

    @staticmethod
    async def toggle_reply_like(db: AsyncSession, user_id: int, reply_id: int) -> bool:
        try:
            reply = await ReplyCrud.get_by_id(db, reply_id)
            if not reply:
                raise HTTPException(status_code=404, detail="Reply not found")
            comment = await CommentCrud.get_by_id(db, reply.comment_id)
            if not comment or comment.is_hidden:
                raise HTTPException(status_code=404, detail="Reply not found")
            await TopicService.get_public_topic(db, comment.topic_id)

            like = await LikeCrud.get_reply_like_by_user_and_reply(
                db, user_id, reply_id
            )
            if like:
                await LikeCrud.delete_reply_like(db, like.like_id)
                result = False
            else:
                created_like = await LikeCrud.create_reply_like(db, user_id, reply_id)
                actor = await UserCrud.get_by_id(db, user_id)
                await NotificationService.create_if_not_self(
                    db,
                    user_id=reply.user_id,
                    type="reply_like",
                    actor_user_id=user_id,
                    target_type="ReplyLike",
                    target_id=created_like.like_id,
                    topic_id=comment.topic_id if comment else None,
                    message=f"{actor.username if actor else '누군가'}님이 내 답글을 좋아합니다.",
                    link=f"/topic/{comment.topic_id}" if comment else "/profile",
                )
                result = True
            await db.commit()
            return result
        except IntegrityError:
            return await LikeService._resolve_duplicate_reply_like(db, user_id, reply_id)
        except Exception:
            await db.rollback()
            raise
