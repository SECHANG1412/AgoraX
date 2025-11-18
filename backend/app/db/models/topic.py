from __future__ import annotations
from datetime import datetime
from typing import List, Optional
from sqlalchemy import ForeignKey, String, Integer, TIMESTAMP, func, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base


class Topic(Base):
    __tablename__ = "topics"

    topic_id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    vote_options: Mapped[dict] = mapped_column(JSON, nullable=False)
    category: Mapped[str] = mapped_column(String(255), nullable=False, default="기타")
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP, server_default=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship("User", back_populates="topics")
    votes: Mapped[List["Vote"]] = relationship(
        "Vote", back_populates="topic", cascade="all, delete-orphan"
    )
    comments: Mapped[List["Comment"]] = relationship(
        "Comment", back_populates="topic", cascade="all, delete-orphan"
    )