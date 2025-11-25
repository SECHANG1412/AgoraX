from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.core.auth import get_user_id, get_user_id_optional
from app.db.schemas.topics import TopicCreate, TopicRead
from app.services import TopicService

router = APIRouter(prefix="/topics", tags=["Topic"])

@router.post("", response_model=TopicRead)
async def create_topic(
    topic_data: TopicCreate,
    user_id: int = Depends(get_user_id),
    db: AsyncSession = Depends(get_db),
):
    return await TopicService.create(db, user_id, topic_data)


@router.get("", response_model=list[TopicRead])
async def list_topics(
    db: AsyncSession = Depends(get_db),
    user_id: int | None = Depends(get_user_id_optional),
    search: str | None = Query(None, min_length=1),
    category: str | None = Query(None),
    sort: str = Query("created_at", enum=["created_at", "like_count", "vote_count"]),
    limit: int = Query(10, ge=1, le=50),
    offset: int = Query(0, ge=0)
):
    return await TopicService.get_all(
        db=db,
        search=search,
        category=category,
        sort=sort,
        limit=limit,
        offset=offset,
        user_id=user_id
    ) 


@router.get("/count", response_model=int)
async def count_topics(
    db: AsyncSession = Depends(get_db),
    search: str | None = Query(None, min_length=1),
    category: str | None = Query(None)):
    return await TopicService.count_total(db, category, search)


@router.get("/{topic_id}", response_model=TopicRead)
async def get_topic_detail(topic_id:int, db:AsyncSession = Depends(get_db), user_id: int | None = Depends(get_user_id_optional)):
    db_topic = await TopicService.get_by_id(db,topic_id,user_id)
    return db_topic

@router.delete("/{topic_id}", response_model=bool)
async def delete_topic(
    topic_id: int,
    user_id: int = Depends(get_user_id),
    db: AsyncSession = Depends(get_db),
):
    return await TopicService.delete(db, topic_id, user_id)
