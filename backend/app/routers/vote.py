from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.core.auth import get_user_id
from app.db.schemas.votes import VoteCreate, VoteRead
from app.services import VoteService

router = APIRouter(prefix="/votes", tags=["Vote"])


@router.post("", response_model=VoteRead)
async def vote_on_topic(
    vote_data: VoteCreate,
    user_id: int = Depends(get_user_id),
    db: AsyncSession = Depends(get_db),
):
    return await VoteService.create(db, vote_data, user_id)


@router.get("/me", response_model=list[VoteRead])
async def get_my_votes(
    user_id: int = Depends(get_user_id),
    db: AsyncSession = Depends(get_db),
):
    return await VoteService.get_all_by_user_id(db, user_id)


@router.get("/topic/{topic_id}")
async def get_vote_stats(
    topic_id: int,
    time_range: str = Query("24h"),
    interval: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    return await VoteService.get_statistics(db, topic_id, time_range, interval)
