from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.core.auth import get_user_id
from app.db.schemas.replys import ReplyCreate, ReplyUpdate, ReplyRead
from app.services import ReplyService

router = APIRouter(prefix="/replies", tags=["Reply"])


@router.post("", response_model=ReplyRead)
async def create_reply(
    reply_data: ReplyCreate,
    user_id: int = Depends(get_user_id),
    db: AsyncSession = Depends(get_db),
):
    return await ReplyService.create(db, user_id, reply_data)


@router.put("/{reply_id}", response_model=ReplyRead)
async def update_reply(
    reply_id: int,
    reply_data: ReplyUpdate,
    user_id: int = Depends(get_user_id),
    db: AsyncSession = Depends(get_db),
):
    return await ReplyService.update_by_id(db, reply_id, reply_data, user_id)


@router.delete("/{reply_id}", response_model=ReplyRead)
async def delete_reply(
    reply_id: int,
    user_id: int = Depends(get_user_id),
    db: AsyncSession = Depends(get_db),
):
    return await ReplyService.delete_by_id(db, reply_id, user_id)
