from pydantic import BaseModel
from datetime import datetime


class ReplyBase(BaseModel):
    comment_id: int
    content: str


class ReplyCreate(ReplyBase):
    pass


class ReplyUpdate(BaseModel):
    content: str


class ReplyInDB(ReplyBase):
    reply_id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ReplyRead(ReplyInDB):
    username: str
