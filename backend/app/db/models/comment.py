from __future__ import annotations
from datetime import datetime
from typing import List
from sqlalchemy import ForeignKey, String, TIMESTAMP, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base


class Comment(Base):
    __tablename__ = "comments"

    comment_id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False)
    topic_id: Mapped[int] = mapped_column(ForeignKey("topics.topic_id"), nullable=False)
    content: Mapped[str] = mapped_column(String(500), nullable=False)
    is_deleted: Mapped[bool] = mapped_column(default=False, server_default="0")
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP, server_default=func.now(), nullable=False
    )

    topic: Mapped["Topic"] = relationship("Topic", back_populates="comments")
    user: Mapped["User"] = relationship("User", back_populates="comments")
    replies: Mapped[List["Reply"]] = relationship(
        "Reply", back_populates="comment", cascade="all, delete-orphan"
    )
    likes: Mapped[List["CommentLike"]] = relationship(
        "CommentLike", back_populates="comment", cascade="all, delete-orphan"
    )
