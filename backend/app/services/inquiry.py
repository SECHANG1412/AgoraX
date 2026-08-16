from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.crud import AdminActionLogCrud, InquiryCrud, UserCrud
from app.db.schemas.admin import AdminDeleteResponse
from app.db.models import Inquiry
from app.db.schemas.inquiries import (
    InquiryCreate,
    InquiryDeleteUpdate,
    InquiryRead,
    InquiryStatusUpdate,
    MyInquiryRead,
)
from app.db.schemas.pagination import PaginatedResponse
from app.services.admin_action_log import AdminActionLogService
from app.services.notification import NotificationService


class InquiryService:
    @staticmethod
    async def create(
        db: AsyncSession,
        inquiry_data: InquiryCreate,
        user_id: int,
    ) -> Inquiry:
        user = await UserCrud.get_by_id(db, user_id)
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        try:
            inquiry = await InquiryCrud.create(db, inquiry_data, user)
            await db.commit()
            await db.refresh(inquiry)
            return inquiry
        except Exception:
            await db.rollback()
            raise

    @staticmethod
    async def get_all_for_admin(
        db: AsyncSession,
        *,
        status: str | None = None,
        start_at=None,
        end_at=None,
        search: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> PaginatedResponse[InquiryRead]:
        if status == "deleted":
            return PaginatedResponse(items=[], total=0, limit=limit, offset=offset)
        inquiries, total = await InquiryCrud.get_all(
            db,
            status=status,
            start_at=start_at,
            end_at=end_at,
            search=search,
            limit=limit,
            offset=offset,
        )
        items = [InquiryRead.model_validate(inquiry) for inquiry in inquiries]
        return PaginatedResponse(items=items, total=total, limit=limit, offset=offset)

    @staticmethod
    async def get_all_by_user(db: AsyncSession, user_id: int) -> list[MyInquiryRead]:
        inquiries = await InquiryCrud.get_all_by_user_id(db, user_id)
        inquiry_ids = [inquiry.inquiry_id for inquiry in inquiries]
        latest_reasons = await AdminActionLogCrud.get_latest_reasons_by_targets(
            db,
            action="UPDATE_INQUIRY_STATUS",
            target_type="Inquiry",
            target_ids=inquiry_ids,
        )

        return [
            MyInquiryRead.model_validate(inquiry).model_copy(
                update={"latest_reason": latest_reasons.get(inquiry.inquiry_id)}
            )
            for inquiry in inquiries
        ]

    @staticmethod
    async def get_by_id_for_admin(db: AsyncSession, inquiry_id: int) -> Inquiry:
        inquiry = await InquiryCrud.get_by_id(db, inquiry_id)
        if not inquiry or inquiry.status == "deleted":
            raise HTTPException(status_code=404, detail="Inquiry not found")
        return inquiry

    @staticmethod
    async def update_status_for_admin(
        db: AsyncSession,
        inquiry_id: int,
        update: InquiryStatusUpdate,
        admin_user_id: int,
    ) -> Inquiry:
        inquiry = await InquiryService.get_by_id_for_admin(db, inquiry_id)
        before_status = inquiry.status
        try:
            updated = await InquiryCrud.update_status(db, inquiry, update.status)
            await AdminActionLogService.record(
                db,
                admin_user_id=admin_user_id,
                action="UPDATE_INQUIRY_STATUS",
                target_type="Inquiry",
                target_id=inquiry_id,
                before_value={"status": before_status},
                after_value={"status": update.status},
                reason=update.reason,
            )
            if inquiry.user_id:
                await NotificationService.create_if_not_self(
                    db,
                    user_id=inquiry.user_id,
                    type="inquiry_status",
                    actor_user_id=admin_user_id,
                    target_type="Inquiry",
                    target_id=inquiry_id,
                    topic_id=None,
                    message=f"문의 상태가 {update.status}로 변경되었습니다.",
                    link="/profile",
                )
            await db.commit()
            await db.refresh(updated)
            return updated
        except Exception:
            await db.rollback()
            raise

    @staticmethod
    async def delete_for_admin(
        db: AsyncSession,
        inquiry_id: int,
        update: InquiryDeleteUpdate,
        admin_user_id: int,
    ) -> AdminDeleteResponse:
        inquiry = await InquiryService.get_by_id_for_admin(db, inquiry_id)
        reason = update.reason or "관리자 문의 삭제"
        snapshot = {
            "title": inquiry.title,
            "content": inquiry.content,
            "status": inquiry.status,
            "name": inquiry.name,
            "email": inquiry.email,
            "user_id": inquiry.user_id,
            "created_at": inquiry.created_at.isoformat(),
        }
        try:
            await AdminActionLogService.record(
                db,
                admin_user_id=admin_user_id,
                action="DELETE_INQUIRY",
                target_type="Inquiry",
                target_id=inquiry_id,
                before_value=snapshot,
                after_value={"deleted": True},
                reason=reason,
            )
            await InquiryCrud.delete(db, inquiry)
            await db.commit()
            return AdminDeleteResponse(deleted=True)
        except Exception:
            await db.rollback()
            raise
