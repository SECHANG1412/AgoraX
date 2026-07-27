from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_admin_user_id
from app.db.database import get_db
from app.db.schemas.admin import AdminDeleteResponse, AdminMeResponse
from app.db.schemas.admin_action_logs import AdminActionLogRead
from app.db.schemas.comments import CommentAdminRead, CommentModerationUpdate
from app.db.schemas.inquiries import InquiryDeleteUpdate, InquiryRead, InquiryStatusUpdate
from app.db.schemas.reports import ReportAdminRead, ReportResolutionUpdate
from app.db.schemas.notifications import ClosedTopicNotificationDispatchResponse
from app.db.schemas.topics import TopicAdminRead, TopicModerationUpdate
from app.db.schemas.users import UserRead
from app.services import (
    AdminActionLogService,
    CommentService,
    InquiryService,
    NotificationService,
    ReportService,
    TopicService,
    UserService,
)

router = APIRouter(prefix="/manage-api", tags=["Admin"])


@router.get("/me", response_model=AdminMeResponse)
async def get_admin_me(admin_user_id: int = Depends(require_admin_user_id)):
    return {"user_id": admin_user_id, "is_admin": True}


@router.get("/users", response_model=list[UserRead])
async def list_users_for_admin(
    _admin_user_id: int = Depends(require_admin_user_id),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(default=100, ge=1, le=200),
):
    return await UserService.get_all_for_admin(db, limit=limit)


@router.get("/logs", response_model=list[AdminActionLogRead])
async def list_admin_action_logs(
    _admin_user_id: int = Depends(require_admin_user_id),
    db: AsyncSession = Depends(get_db),
    action: str | None = None,
    target_type: str | None = None,
    admin_user_id: int | None = None,
    start_at: datetime | None = None,
    end_at: datetime | None = None,
    limit: int = Query(default=100, ge=1, le=200),
):
    return await AdminActionLogService.get_all_for_admin(
        db,
        action=action,
        target_type=target_type,
        admin_user_id=admin_user_id,
        start_at=start_at,
        end_at=end_at,
        limit=limit,
    )


@router.post(
    "/notifications/topic-close/dispatch",
    response_model=ClosedTopicNotificationDispatchResponse,
)
async def dispatch_closed_topic_notifications(
    _admin_user_id: int = Depends(require_admin_user_id),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(default=100, ge=1, le=500),
):
    return await NotificationService.dispatch_closed_topic_notifications(
        db, limit=limit
    )


@router.get("/inquiries", response_model=list[InquiryRead])
async def list_inquiries(
    _admin_user_id: int = Depends(require_admin_user_id),
    db: AsyncSession = Depends(get_db),
    status: str | None = None,
    start_at: datetime | None = None,
    end_at: datetime | None = None,
):
    return await InquiryService.get_all_for_admin(
        db,
        status=status,
        start_at=start_at,
        end_at=end_at,
    )


@router.get("/inquiries/{inquiry_id}", response_model=InquiryRead)
async def get_inquiry(
    inquiry_id: int,
    _admin_user_id: int = Depends(require_admin_user_id),
    db: AsyncSession = Depends(get_db),
):
    return await InquiryService.get_by_id_for_admin(db, inquiry_id)


@router.patch("/inquiries/{inquiry_id}/status", response_model=InquiryRead)
async def update_inquiry_status(
    inquiry_id: int,
    update: InquiryStatusUpdate,
    admin_user_id: int = Depends(require_admin_user_id),
    db: AsyncSession = Depends(get_db),
):
    return await InquiryService.update_status_for_admin(
        db, inquiry_id, update, admin_user_id
    )


@router.patch("/inquiries/{inquiry_id}/delete", response_model=AdminDeleteResponse)
async def delete_inquiry(
    inquiry_id: int,
    update: InquiryDeleteUpdate,
    admin_user_id: int = Depends(require_admin_user_id),
    db: AsyncSession = Depends(get_db),
):
    return await InquiryService.delete_for_admin(db, inquiry_id, update, admin_user_id)


@router.get("/topics", response_model=list[TopicAdminRead])
async def list_topics_for_admin(
    _admin_user_id: int = Depends(require_admin_user_id),
    db: AsyncSession = Depends(get_db),
    status: str | None = None,
    start_at: datetime | None = None,
    end_at: datetime | None = None,
):
    return await TopicService.get_all_for_admin(
        db,
        status=status,
        start_at=start_at,
        end_at=end_at,
    )


@router.patch("/topics/{topic_id}/delete", response_model=AdminDeleteResponse)
async def delete_topic_for_admin(
    topic_id: int,
    update: TopicModerationUpdate,
    admin_user_id: int = Depends(require_admin_user_id),
    db: AsyncSession = Depends(get_db),
):
    return await TopicService.delete_for_admin(db, topic_id, update, admin_user_id)


@router.get("/comments", response_model=list[CommentAdminRead])
async def list_comments_for_admin(
    _admin_user_id: int = Depends(require_admin_user_id),
    db: AsyncSession = Depends(get_db),
    status: str | None = None,
    start_at: datetime | None = None,
    end_at: datetime | None = None,
):
    return await CommentService.get_all_for_admin(
        db,
        status=status,
        start_at=start_at,
        end_at=end_at,
    )


@router.patch("/comments/{comment_id}/delete", response_model=AdminDeleteResponse)
async def delete_comment_for_admin(
    comment_id: int,
    update: CommentModerationUpdate,
    admin_user_id: int = Depends(require_admin_user_id),
    db: AsyncSession = Depends(get_db),
):
    return await CommentService.delete_for_admin(db, comment_id, update, admin_user_id)
@router.get("/reports", response_model=list[ReportAdminRead])
async def list_reports_for_admin(
    _admin_user_id: int = Depends(require_admin_user_id),
    db: AsyncSession = Depends(get_db),
    status: str | None = None,
    target_type: str | None = None,
    start_at: datetime | None = None,
    end_at: datetime | None = None,
):
    return await ReportService.get_all_for_admin(
        db,
        status=status,
        target_type=target_type,
        start_at=start_at,
        end_at=end_at,
    )


@router.patch("/reports/{report_id}/resolve", response_model=ReportAdminRead)
async def resolve_report_for_admin(
    report_id: int,
    update: ReportResolutionUpdate,
    admin_user_id: int = Depends(require_admin_user_id),
    db: AsyncSession = Depends(get_db),
):
    return await ReportService.resolve_for_admin(
        db, report_id, update, admin_user_id
    )


@router.patch("/reports/{report_id}/dismiss", response_model=ReportAdminRead)
async def dismiss_report_for_admin(
    report_id: int,
    update: ReportResolutionUpdate,
    admin_user_id: int = Depends(require_admin_user_id),
    db: AsyncSession = Depends(get_db),
):
    return await ReportService.dismiss_for_admin(
        db, report_id, update, admin_user_id
    )
