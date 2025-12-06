from datetime import datetime
from pydantic import BaseModel, Field, field_validator

class TopicBase(BaseModel):
    title: str
    category: str = "기타"
    vote_options: list[str] = Field(..., min_length=2, max_length=4)
    description: str | None = None

    @field_validator("vote_options")
    @classmethod
    def check_vote_options_length(cls, value):
        if not (2 <= len(value) <= 4):
            raise ValueError("vote_options must contain between 2 and 4 options.")
        return value


class TopicCreate(TopicBase):
    pass

class TopicInDB(TopicBase):
    topic_id: int
    created_at: datetime
    user_id: int

    class Config:
        from_attributes = True


class TopicRead(TopicInDB):
    has_voted: bool = False
    user_vote_index: int | None = None
    vote_results: list[int] = []
    total_vote: int = 0
    like_count: int = 0
    has_liked: bool = False
    is_pinned: bool = False
    comment_count: int = 0
