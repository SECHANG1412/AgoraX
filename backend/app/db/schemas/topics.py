from datetime import datetime, timezone
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.db.schemas.content_limits import (
    TOPIC_CATEGORY_MAX_LENGTH,
    TOPIC_DESCRIPTION_MAX_LENGTH,
    TOPIC_OPTION_MAX_LENGTH,
    TOPIC_TITLE_MAX_LENGTH,
)

TOPIC_OPTION_COUNT = 2


class TopicBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=TOPIC_TITLE_MAX_LENGTH)
    category: str = "자유"
    vote_options: list[str] = Field(..., min_length=TOPIC_OPTION_COUNT, max_length=TOPIC_OPTION_COUNT)
    description: str | None = None

    @field_validator("title")
    @classmethod
    def title_must_not_be_blank(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("title must not be blank.")
        return stripped

    @field_validator("vote_options")
    @classmethod
    def check_vote_options_length(cls, value):
        if len(value) != TOPIC_OPTION_COUNT:
            raise ValueError("vote_options must contain exactly 2 options.")
        return value

    @field_validator('category')
    @classmethod
    def validate_category(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError('category must not be blank.')
        if len(stripped) > TOPIC_CATEGORY_MAX_LENGTH:
            raise ValueError(
                f'category must not exceed {TOPIC_CATEGORY_MAX_LENGTH} characters.'
            )
        return stripped

    @field_validator('description')
    @classmethod
    def validate_description(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        if not stripped:
            raise ValueError('description must not be blank.')
        if len(stripped) > TOPIC_DESCRIPTION_MAX_LENGTH:
            raise ValueError(
                f'description must not exceed {TOPIC_DESCRIPTION_MAX_LENGTH} characters.'
            )
        return stripped

    @field_validator('vote_options')
    @classmethod
    def validate_vote_option_content(cls, value: list[str]) -> list[str]:
        normalized_options = [option.strip() for option in value]
        if any(not option for option in normalized_options):
            raise ValueError('vote options must not be blank.')
        if any(len(option) > TOPIC_OPTION_MAX_LENGTH for option in normalized_options):
            raise ValueError(
                f'vote options must not exceed {TOPIC_OPTION_MAX_LENGTH} characters.'
            )
        return normalized_options


class TopicCreate(TopicBase):
    expires_at: datetime

    @field_validator("expires_at")
    @classmethod
    def expires_at_must_be_in_future(cls, value: datetime) -> datetime:
        expires_at = value
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        else:
            expires_at = expires_at.astimezone(timezone.utc)

        if expires_at <= datetime.now(timezone.utc):
            raise ValueError("expires_at must be in the future.")
        return expires_at


class TopicInDB(TopicBase):
    topic_id: int
    created_at: datetime
    user_id: int
    expires_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class TopicRead(TopicInDB):
    author_name: str | None = None
    has_voted: bool = False
    user_vote_index: int | None = None
    vote_results: list[int] = Field(default_factory=list)
    total_vote: int = 0
    like_count: int = 0
    has_liked: bool = False
    is_pinned: bool = False
    comment_count: int = 0
    is_closed: bool = False


class TopicAdminRead(TopicInDB):
    is_hidden: bool = False
    hidden_at: datetime | None = None
    hidden_by: int | None = None
    is_closed: bool = False


class TopicModerationUpdate(BaseModel):
    reason: str = Field(..., min_length=1, max_length=500)

    @field_validator("reason")
    @classmethod
    def reason_must_not_be_blank(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("reason must not be blank.")
        return stripped
