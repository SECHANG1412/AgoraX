from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.crud import CommentCrud, ReplyCrud, TopicCrud, UserCrud
from app.db.crud.report import ReportCrud
from app.db.schemas.reports import ReportCreate, ReportRead
from app.db.schemas.comments import CommentModerationUpdate
from app.db.schemas.reports import ReportAdminRead, ReportResolutionUpdate
from app.db.schemas.pagination import PaginatedResponse
from app.db.schemas.topics import TopicModerationUpdate
from app.services.admin_action_log import AdminActionLogService
from app.services.comment import CommentService
from app.services.notification import NotificationService
from app.services.reply import ReplyService
from app.services.topic import TopicService



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
    @staticmethod
    async def get_all_for_admin(
        db: AsyncSession,
        *,
        status: str | None = None,
        target_type: str | None = None,
        start_at=None,
        end_at=None,
        search: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> PaginatedResponse[ReportAdminRead]:
        reports, total = await ReportCrud.get_all_for_admin(
            db,
            status=status,
            target_type=target_type,
            start_at=start_at,
            end_at=end_at,
            search=search,
            limit=limit,
            offset=offset,
            group_targets=True,
        )
        users = await UserCrud.get_by_ids(
            db, list({report.reporter_user_id for report in reports})
        )
        counts = await ReportCrud.count_by_targets(
            db, list({(report.target_type, report.target_id) for report in reports})
        )
        items = [
            ReportAdminRead.model_validate(
                {
                    **report.__dict__,
                    "reporter_name": users[report.reporter_user_id].username,
                    "report_count": counts.get((report.target_type, report.target_id), 1),
                }
            )
            for report in reports
        ]
        return PaginatedResponse(items=items, total=total, limit=limit, offset=offset)

    @staticmethod
    async def resolve_for_admin(
        db: AsyncSession,
        report_id: int,
        update: ReportResolutionUpdate,
        admin_user_id: int,
    ) -> ReportAdminRead:
        report = await ReportService._get_pending_for_update(db, report_id)
        related_reports = await ReportService._get_related_pending_reports(db, report)
        try:
            if report.target_type == "topic":
                await TopicService.delete_for_admin(
                    db,
                    report.target_id,
                    TopicModerationUpdate(reason=update.resolution),
                    admin_user_id,
                    commit=False,
                )
            elif report.target_type == "comment":
                await CommentService.delete_for_admin(
                    db,
                    report.target_id,
                    CommentModerationUpdate(reason=update.resolution),
                    admin_user_id,
                    commit=False,
                )
            else:
                await ReplyService.delete_for_admin(
                    db,
                    report.target_id,
                    update.resolution,
                    admin_user_id,
                    commit=False,
                )

            now = datetime.now(timezone.utc)
            for related in related_reports:
                await ReportService._notify_reporter(
                    db, related, admin_user_id, "신고한 콘텐츠가 운영정책 위반으로 처리되었습니다."
                )
                await ReportCrud.resolve_target_reports(
                    db,
                    target_type=related.target_type,
                    target_id=related.target_id,
                    status="resolved",
                    handled_by=admin_user_id,
                    handled_at=now,
                    resolution=update.resolution,
                )
            await AdminActionLogService.record(
                db,
                admin_user_id=admin_user_id,
                action="RESOLVE_REPORT",
                target_type="Report",
                target_id=report_id,
                before_value={"status": "pending"},
                after_value={"status": "resolved", "target_deleted": True},
                reason=update.resolution,
            )
            await db.commit()
            await db.refresh(report)
            return await ReportService._build_admin_read(db, report)
        except Exception:
            await db.rollback()
            raise

    @staticmethod
    async def dismiss_for_admin(
        db: AsyncSession,
        report_id: int,
        update: ReportResolutionUpdate,
        admin_user_id: int,
    ) -> ReportAdminRead:
        report = await ReportService._get_pending_for_update(db, report_id)
        reports, _ = await ReportCrud.get_all_for_admin(db, status="pending")
        matching = [
            item for item in reports
            if item.target_type == report.target_type and item.target_id == report.target_id
        ]
        try:
            now = datetime.now(timezone.utc)
            for item in matching:
                await ReportService._notify_reporter(
                    db, item, admin_user_id, "신고한 콘텐츠를 검토했으나 운영정책 위반으로 판단되지 않았습니다."
                )
            await ReportCrud.resolve_target_reports(
                db,
                target_type=report.target_type,
                target_id=report.target_id,
                status="dismissed",
                handled_by=admin_user_id,
                handled_at=now,
                resolution=update.resolution,
            )
            await AdminActionLogService.record(
                db,
                admin_user_id=admin_user_id,
                action="DISMISS_REPORT",
                target_type="Report",
                target_id=report_id,
                before_value={"status": "pending"},
                after_value={"status": "dismissed"},
                reason=update.resolution,
            )
            await db.commit()
            await db.refresh(report)
            return await ReportService._build_admin_read(db, report)
        except Exception:
            await db.rollback()
            raise

    @staticmethod
    async def _get_pending_for_update(db: AsyncSession, report_id: int):
        report = await ReportCrud.get_by_id_for_update(db, report_id)
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        if report.status != "pending":
            raise HTTPException(status_code=409, detail="Report already handled")
        return report

    @staticmethod
    async def _get_related_pending_reports(db: AsyncSession, report):
        pending, _ = await ReportCrud.get_all_for_admin(db, status="pending")
        if report.target_type == "topic":
            topic_id = report.target_id
            return [item for item in pending if item.target_snapshot.get("topic_id") == topic_id]
        if report.target_type == "comment":
            comment_id = report.target_id
            return [
                item for item in pending
                if item.target_id == comment_id and item.target_type == "comment"
                or item.target_type == "reply" and item.target_snapshot.get("comment_id") == comment_id
            ]

        comment_id = report.target_snapshot.get("comment_id")
        replies = await ReplyCrud.get_all_by_comment_id(db, comment_id) if comment_id else []
        children_by_parent: dict[int, list[int]] = {}
        for reply in replies:
            if reply.parent_reply_id is not None:
                children_by_parent.setdefault(reply.parent_reply_id, []).append(reply.reply_id)
        target_ids = {report.target_id}
        stack = [report.target_id]
        while stack:
            children = children_by_parent.get(stack.pop(), [])
            target_ids.update(children)
            stack.extend(children)
        return [item for item in pending if item.target_type == "reply" and item.target_id in target_ids]

    @staticmethod
    async def _notify_reporter(
        db: AsyncSession, report, admin_user_id: int, message: str
    ) -> None:
        await NotificationService.create_if_not_self(
            db,
            user_id=report.reporter_user_id,
            type="report_status",
            actor_user_id=admin_user_id,
            target_type="Report",
            target_id=report.report_id,
            topic_id=report.target_snapshot.get("topic_id"),
            message=message,
            link="/profile",
        )

    @staticmethod
    async def _build_admin_read(db: AsyncSession, report) -> ReportAdminRead:
        reporter = await UserCrud.get_by_id(db, report.reporter_user_id)
        counts = await ReportCrud.count_by_targets(
            db, [(report.target_type, report.target_id)]
        )
        return ReportAdminRead.model_validate(
            {
                **report.__dict__,
                "reporter_name": reporter.username if reporter else "탈퇴한 사용자",
                "report_count": counts.get((report.target_type, report.target_id), 1),
            }
        )
