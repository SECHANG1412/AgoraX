from datetime import datetime

from sqlalchemy import desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Inquiry, User
from app.db.schemas.inquiries import InquiryCreate, InquiryStatus


class InquiryCrud:
    @staticmethod
    async def create(
        db: AsyncSession,
        inquiry_data: InquiryCreate,
        user: User,
    ) -> Inquiry:
        inquiry = Inquiry(
            **inquiry_data.model_dump(),
            user_id=user.user_id,
            name=user.username,
            email=user.email,
            status="pending",
        )
        db.add(inquiry)
        await db.flush()
        return inquiry

    @staticmethod
    async def get_all(
        db: AsyncSession,
        *,
        status: str | None = None,
        start_at: datetime | None = None,
        end_at: datetime | None = None,
        search: str | None = None,
        limit: int | None = None,
        offset: int = 0,
    ) -> tuple[list[Inquiry], int]:
        filters = []
        if status:
            filters.append(Inquiry.status == status)
        else:
            filters.append(Inquiry.status != "deleted")
        if start_at:
            filters.append(Inquiry.created_at >= start_at)
        if end_at:
            filters.append(Inquiry.created_at < end_at)
        if search:
            pattern = f"%{search.strip()}%"
            filters.append(
                or_(
                    Inquiry.title.ilike(pattern),
                    Inquiry.content.ilike(pattern),
                    Inquiry.name.ilike(pattern),
                    Inquiry.email.ilike(pattern),
                )
            )

        total_result = await db.execute(
            select(func.count()).select_from(Inquiry).where(*filters)
        )
        query = select(Inquiry).where(*filters).order_by(
            desc(Inquiry.created_at), desc(Inquiry.inquiry_id)
        )
        if limit is not None:
            query = query.limit(limit).offset(offset)
        result = await db.execute(query)
        return list(result.scalars().all()), total_result.scalar() or 0

    @staticmethod
    async def get_all_by_user_id(db: AsyncSession, user_id: int) -> list[Inquiry]:
        result = await db.execute(
            select(Inquiry)
            .where(Inquiry.user_id == user_id, Inquiry.status != "deleted")
            .order_by(desc(Inquiry.created_at), desc(Inquiry.inquiry_id))
        )
        return list(result.scalars().all())

    @staticmethod
    async def get_by_id(db: AsyncSession, inquiry_id: int) -> Inquiry | None:
        return await db.get(Inquiry, inquiry_id)

    @staticmethod
    async def update_status(
        db: AsyncSession,
        inquiry: Inquiry,
        status: InquiryStatus,
    ) -> Inquiry:
        inquiry.status = status
        await db.flush()
        return inquiry

    @staticmethod
    async def delete(db: AsyncSession, inquiry: Inquiry) -> None:
        await db.delete(inquiry)
        await db.flush()
