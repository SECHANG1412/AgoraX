from pydantic import BaseModel
from datetime import datetime


class ReplyBase(BaseModel):
    comment_id: int
    content: str
    parent_reply_id: int | None = None


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
    like_count: int = 0
    has_liked: bool = False
    replies: list["ReplyRead"] = []

    class Config:
        from_attributes = True

# Forward reference for nested replies
ReplyRead.model_rebuild()
