from __future__ import annotations
from datetime import datetime
from typing import List
from sqlalchemy import ForeignKey, String, TIMESTAMP, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base


class Reply(Base):
    __tablename__ = "replies"

    reply_id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False)
    comment_id: Mapped[int] = mapped_column(
        ForeignKey("comments.comment_id"), nullable=False
    )
    parent_reply_id: Mapped[int | None] = mapped_column(
        ForeignKey("replies.reply_id"), nullable=True
    )
    content: Mapped[str] = mapped_column(String(500), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP, server_default=func.now(), nullable=False
    )

    comment: Mapped["Comment"] = relationship("Comment", back_populates="replies")
    user: Mapped["User"] = relationship("User", back_populates="replies")
    parent_reply: Mapped["Reply"] = relationship("Reply", remote_side="Reply.reply_id", backref="children")
    likes: Mapped[List["ReplyLike"]] = relationship(
        "ReplyLike", back_populates="reply", cascade="all, delete-orphan"
    )
