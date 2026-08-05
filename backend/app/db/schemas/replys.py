from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.db.schemas.content_limits import REPLY_CONTENT_MAX_LENGTH


def _strip_non_blank_content(value: str) -> str:
    stripped = value.strip()
    if not stripped:
        raise ValueError('content must not be blank.')
    return stripped


class ReplyBase(BaseModel):
    comment_id: int
    content: str = Field(..., min_length=1, max_length=REPLY_CONTENT_MAX_LENGTH)
    parent_reply_id: int | None = None

    _normalize_content = field_validator('content')(_strip_non_blank_content)


class ReplyCreate(ReplyBase):
    pass


class ReplyUpdate(BaseModel):
    content: str = Field(..., min_length=1, max_length=REPLY_CONTENT_MAX_LENGTH)

    _normalize_content = field_validator('content')(_strip_non_blank_content)


class ReplyInDB(ReplyBase):
    reply_id: int
    user_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReplyRead(ReplyInDB):
    username: str
    like_count: int = 0
    has_liked: bool = False
    replies: list["ReplyRead"] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)

# Forward reference for nested replies
ReplyRead.model_rebuild()
