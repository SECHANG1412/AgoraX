from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator
from app.db.schemas.replys import ReplyRead
from app.db.schemas.content_limits import COMMENT_CONTENT_MAX_LENGTH


def _strip_non_blank_content(value: str) -> str:
    stripped = value.strip()
    if not stripped:
        raise ValueError('content must not be blank.')
    return stripped


class CommentBase(BaseModel):
    topic_id: int
    content: str = Field(..., min_length=1, max_length=COMMENT_CONTENT_MAX_LENGTH)

    _normalize_content = field_validator('content')(_strip_non_blank_content)


class CommentCreate(CommentBase):
    pass


class CommentUpdate(BaseModel):
    content: str = Field(..., min_length=1, max_length=COMMENT_CONTENT_MAX_LENGTH)

    _normalize_content = field_validator('content')(_strip_non_blank_content)


class CommentInDB(CommentBase):
    comment_id: int
    user_id: int
    is_deleted: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CommentRead(CommentInDB):
    username: str
    replies: list[ReplyRead] = Field(default_factory=list)
    like_count: int = 0
    has_liked: bool = False


class CommentAdminRead(CommentInDB):
    is_hidden: bool = False
    hidden_at: datetime | None = None
    hidden_by: int | None = None


class CommentModerationUpdate(BaseModel):
    reason: str = Field(..., min_length=1, max_length=500)

    @field_validator("reason")
    @classmethod
    def reason_must_not_be_blank(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("reason must not be blank.")
        return stripped
