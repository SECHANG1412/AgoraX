from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_user_id
from app.db.database import get_db
from app.db.schemas.reports import ReportCreate, ReportRead
from app.services.report import ReportService

router = APIRouter(prefix="/reports", tags=["Report"])


@router.post("", response_model=ReportRead, status_code=201)
async def create_report(
    report_data: ReportCreate,
    user_id: int = Depends(get_user_id),
    db: AsyncSession = Depends(get_db),
):
    return await ReportService.create(db, report_data, user_id)
