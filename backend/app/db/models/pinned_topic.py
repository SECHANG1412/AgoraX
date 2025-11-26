from __future__ import annotations
from datetime import datetime
from sqlalchemy import ForeignKey, TIMESTAMP, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db.database import Base


class PinnedTopic(Base):
    __tablename__ = "pinned_topics"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), primary_key=True)
    topic_id: Mapped[int] = mapped_column(ForeignKey("topics.topic_id"), primary_key=True)
    pinned_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now(), nullable=False)
