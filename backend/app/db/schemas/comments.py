from pydantic import BaseModel
from datetime import datetime


class CommentBase(BaseModel):
    topic_id: int
    content: str


class CommentCreate(CommentBase):
    pass


class CommentUpdate(BaseModel):
    content: str


class CommentInDB(CommentBase):
    comment_id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class CommentRead(CommentInDB):
    username: str
    replies: list = []
