from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from app.db.models import Reply
from app.db.crud import UserCrud, ReplyCrud, LikeCrud, CommentCrud
from app.db.schemas.replys import ReplyRead, ReplyCreate, ReplyUpdate


class ReplyService:
    @staticmethod
    async def create(
        db: AsyncSession, user_id: int, reply_data: ReplyCreate
    ) -> ReplyRead:
        comment = await CommentCrud.get_by_id(db, reply_data.comment_id)
        if not comment:
            raise HTTPException(status_code=404, detail="Comment not found")
        if getattr(comment, "is_deleted", False):
            raise HTTPException(status_code=400, detail="Cannot reply to a deleted comment")
        try:
            reply = await ReplyCrud.create(db, reply_data, user_id)
            await db.commit()
            await db.refresh(reply)
            return await ReplyService._build_reply_read(db, reply, user_id)
        except Exception:
            await db.rollback()
            raise

    @staticmethod
    async def update_by_id(
        db: AsyncSession, reply_id: int, reply_data: ReplyUpdate, user_id: int
    ) -> ReplyRead:
        reply = await ReplyCrud.get_by_id(db, reply_id)
        if not reply:
            raise HTTPException(status_code=404, detail="Reply not found")
        if reply.user_id != user_id:
            raise HTTPException(status_code=403, detail="Not your reply")
        try:
            updated_reply = await ReplyCrud.update_by_id(db, reply_id, reply_data)
            await db.commit()
            await db.refresh(updated_reply)
            return await ReplyService._build_reply_read(db, updated_reply, user_id)
        except Exception:
            await db.rollback()
            raise

    @staticmethod
    async def delete_by_id(db: AsyncSession, reply_id: int, user_id: int) -> ReplyRead:
        reply = await ReplyCrud.get_by_id(db, reply_id)
        if not reply:
            raise HTTPException(status_code=404, detail="Reply not found")
        if reply.user_id != user_id:
            raise HTTPException(status_code=403, detail="Not your reply")
        try:
            await LikeCrud.delete_reply_likes_by_reply_id(db, reply_id)
            deleted = await ReplyCrud.delete_by_id(db, reply_id)

            # If parent comment was soft-deleted and now has no replies, hard delete it.
            remaining = await ReplyCrud.count_by_comment_id(db, reply.comment_id)
            if remaining == 0:
                parent_comment = await CommentCrud.get_by_id(db, reply.comment_id)
                if parent_comment and getattr(parent_comment, "is_deleted", False):
                    await CommentCrud.delete_by_id(db, parent_comment.comment_id)

            await db.commit()
            return await ReplyService._build_reply_read(db, deleted, user_id)
        except Exception:
            await db.rollback()
            raise

    @staticmethod
    async def get_all_by_comment_id(
        db: AsyncSession, comment_id: int, user_id: int | None = None
    ) -> list[ReplyRead]:
        replies = await ReplyCrud.get_all_by_comment_id(db, comment_id)
        built = [await ReplyService._build_reply_read(db, r, user_id) for r in replies]

        # Build nested tree using parent_reply_id
        reply_map: dict[int, ReplyRead] = {r.reply_id: r for r in built}
        roots: list[ReplyRead] = []
        for r in built:
            if r.parent_reply_id and r.parent_reply_id in reply_map:
                reply_map[r.parent_reply_id].replies.append(r)
            else:
                roots.append(r)
        return roots

    @staticmethod
    async def _build_reply_read(
        db: AsyncSession, reply: Reply, user_id: int | None = None
    ) -> ReplyRead:
        user = await UserCrud.get_by_id(db=db, user_id=reply.user_id)
        like_count = await LikeCrud.count_reply_likes(db, reply.reply_id)
        has_liked = await LikeCrud.has_user_liked_reply(db, reply.reply_id, user_id) if user_id else False


        return ReplyRead(
            **reply.__dict__,
            username=user.username,
            like_count=like_count,
            has_liked=has_liked,
        )
