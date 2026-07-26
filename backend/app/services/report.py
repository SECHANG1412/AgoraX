from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.crud import CommentCrud, ReplyCrud, TopicCrud, UserCrud
from app.db.crud.report import ReportCrud
from app.db.schemas.reports import ReportCreate, ReportRead


class ReportService:
    @staticmethod
    async def create(
        db: AsyncSession, report_data: ReportCreate, reporter_user_id: int
    ) -> ReportRead:
        target_snapshot = await ReportService._get_target_snapshot(db, report_data)
        if target_snapshot["author_id"] == reporter_user_id:
            raise HTTPException(status_code=400, detail="Cannot report your own content")
        if await ReportCrud.get_duplicate(
            db, reporter_user_id, report_data.target_type, report_data.target_id
        ):
            raise HTTPException(status_code=409, detail="Content already reported")

        try:
            report = await ReportCrud.create(
                db, report_data, reporter_user_id, target_snapshot
            )
            await db.commit()
            await db.refresh(report)
            return ReportRead.model_validate(report)
        except IntegrityError as exc:
            await db.rollback()
            raise HTTPException(status_code=409, detail="Content already reported") from exc
        except Exception:
            await db.rollback()
            raise

    @staticmethod
    async def _get_target_snapshot(db: AsyncSession, report_data: ReportCreate) -> dict:
        if report_data.target_type == "topic":
            topic = await TopicCrud.get_public_by_id(db, report_data.target_id)
            if not topic:
                raise HTTPException(status_code=404, detail="Topic not found")
            author = await UserCrud.get_by_id(db, topic.user_id)
            return {
                "author_id": topic.user_id,
                "author_name": author.username if author else None,
                "title": topic.title,
                "content": topic.description,
                "topic_id": topic.topic_id,
                "created_at": topic.created_at.isoformat(),
            }

        if report_data.target_type == "comment":
            comment = await CommentCrud.get_by_id(db, report_data.target_id)
            if not comment or comment.is_deleted or comment.is_hidden:
                raise HTTPException(status_code=404, detail="Comment not found")
            topic = await TopicCrud.get_public_by_id(db, comment.topic_id)
            if not topic:
                raise HTTPException(status_code=404, detail="Comment not found")
            author = await UserCrud.get_by_id(db, comment.user_id)
            return {
                "author_id": comment.user_id,
                "author_name": author.username if author else None,
                "title": f"댓글 #{comment.comment_id}",
                "content": comment.content,
                "topic_id": comment.topic_id,
                "created_at": comment.created_at.isoformat(),
            }

        reply = await ReplyCrud.get_by_id(db, report_data.target_id)
        if not reply:
            raise HTTPException(status_code=404, detail="Reply not found")
        comment = await CommentCrud.get_by_id(db, reply.comment_id)
        if not comment or comment.is_hidden:
            raise HTTPException(status_code=404, detail="Reply not found")
        topic = await TopicCrud.get_public_by_id(db, comment.topic_id)
        if not topic:
            raise HTTPException(status_code=404, detail="Reply not found")
        author = await UserCrud.get_by_id(db, reply.user_id)
        return {
            "author_id": reply.user_id,
            "author_name": author.username if author else None,
            "title": f"답글 #{reply.reply_id}",
            "content": reply.content,
            "topic_id": comment.topic_id,
            "comment_id": reply.comment_id,
            "created_at": reply.created_at.isoformat(),
        }
