from datetime import datetime

from sqlalchemy import desc, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Report, User
from app.db.schemas.reports import ReportCreate


class ReportCrud:
    @staticmethod
    async def create(
        db: AsyncSession,
        report_data: ReportCreate,
        reporter_user_id: int,
        target_snapshot: dict,
    ) -> Report:
        report = Report(
            **report_data.model_dump(),
            reporter_user_id=reporter_user_id,
            target_snapshot=target_snapshot,
        )
        db.add(report)
        await db.flush()
        return report

    @staticmethod
    async def get_duplicate(
        db: AsyncSession, reporter_user_id: int, target_type: str, target_id: int
    ) -> Report | None:
        result = await db.execute(
            select(Report).where(
                Report.reporter_user_id == reporter_user_id,
                Report.target_type == target_type,
                Report.target_id == target_id,
            )
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_id(db: AsyncSession, report_id: int) -> Report | None:
        return await db.get(Report, report_id)

    @staticmethod
    async def get_all_for_admin(
        db: AsyncSession,
        *,
        status: str | None = None,
        target_type: str | None = None,
        start_at: datetime | None = None,
        end_at: datetime | None = None,
        search: str | None = None,
        limit: int | None = None,
        offset: int = 0,
        group_targets: bool = False,
    ) -> tuple[list[Report], int]:
        filters = []
        if status:
            filters.append(Report.status == status)
        if target_type:
            filters.append(Report.target_type == target_type)
        if start_at:
            filters.append(Report.created_at >= start_at)
        if end_at:
            filters.append(Report.created_at < end_at)
        if search:
            pattern = f"%{search.strip()}%"
            filters.append(
                or_(
                    Report.detail.ilike(pattern),
                    Report.resolution.ilike(pattern),
                    User.username.ilike(pattern),
                )
            )

        if group_targets:
            grouped_ids = (
                select(func.max(Report.report_id).label("report_id"))
                .join(User, User.user_id == Report.reporter_user_id)
                .where(*filters)
                .group_by(Report.target_type, Report.target_id)
                .subquery()
            )
            total_result = await db.execute(
                select(func.count()).select_from(grouped_ids)
            )
            query = (
                select(Report)
                .where(Report.report_id.in_(select(grouped_ids.c.report_id)))
                .order_by(desc(Report.created_at), desc(Report.report_id))
            )
        else:
            total_result = await db.execute(
                select(func.count())
                .select_from(Report)
                .join(User, User.user_id == Report.reporter_user_id)
                .where(*filters)
            )
            query = (
                select(Report)
                .join(User, User.user_id == Report.reporter_user_id)
                .where(*filters)
                .order_by(desc(Report.created_at), desc(Report.report_id))
            )
        if limit is not None:
            query = query.limit(limit).offset(offset)
        result = await db.execute(query)
        return list(result.scalars().all()), total_result.scalar() or 0

    @staticmethod
    async def count_by_targets(
        db: AsyncSession, targets: list[tuple[str, int]]
    ) -> dict[tuple[str, int], int]:
        if not targets:
            return {}
        conditions = [
            (Report.target_type == target_type) & (Report.target_id == target_id)
            for target_type, target_id in targets
        ]
        query = (
            select(Report.target_type, Report.target_id, func.count(Report.report_id))
            .where(or_(*conditions))
            .group_by(Report.target_type, Report.target_id)
        )
        result = await db.execute(query)
        return {(target_type, target_id): count for target_type, target_id, count in result.all()}

    @staticmethod
    async def resolve_target_reports(
        db: AsyncSession,
        *,
        target_type: str,
        target_id: int,
        status: str,
        handled_by: int,
        handled_at: datetime,
        resolution: str,
    ) -> None:
        await db.execute(
            update(Report)
            .where(
                Report.target_type == target_type,
                Report.target_id == target_id,
                Report.status == "pending",
            )
            .values(
                status=status,
                handled_by=handled_by,
                handled_at=handled_at,
                resolution=resolution,
            )
        )
    @staticmethod
    async def get_by_id_for_update(db: AsyncSession, report_id: int) -> Report | None:
        result = await db.execute(
            select(Report).where(Report.report_id == report_id).with_for_update()
        )
        return result.scalar_one_or_none()
