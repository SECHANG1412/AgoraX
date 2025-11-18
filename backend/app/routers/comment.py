from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.core.auth import get_user_id, get_user_id_optional
from app.db.schemas.comments import CommentCreate, CommentUpdate, CommentRead
from app.services import CommentService

router = APIRouter(prefix="/comments", tags=["Comment"])

@router.post("", response_model=CommentRead)
async def create_comment(
    comment_data: CommentCreate,
    user_id: int = Depends(get_user_id),
    db : AsyncSession = Depends(get_db),
):
    return await CommentService.create(db, user_id, comment_data)

@router.put("/{comment_id}", response_model=CommentRead)
async def update_comment(
    comment_id: int,
    comment_data: CommentUpdate,
    user_id: int = Depends(get_user_id),
    db : AsyncSession = Depends(get_db),
):
    return await CommentService.update_by_id(db, comment_id, comment_data, user_id)

@router.delete("/{comment_id}", response_model=CommentRead)
async def delete_comment(
    comment_id: int,
    user_id: int = Depends(get_user_id),
    db : AsyncSession = Depends(get_db),
):
    return await CommentService.delete_by_id(db, comment_id, user_id)

@router.get("/by-topic/{topic_id}", response_model=list[CommentRead])
async def get_comments_by_topic(
    topic_id: int,
    user_id: int | None = Depends(get_user_id_optional),
    db: AsyncSession = Depends(get_db),
):
    return await CommentService.get_all_by_topic_id(db, topic_id, user_id)