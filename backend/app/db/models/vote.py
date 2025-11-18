from __future__ import annotations
from datetime import datetime
from sqlalchemy import ForeignKey, TIMESTAMP, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base

class Vote(Base):
    __tablename__ = "votes"

    vote_id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False)
    topic_id: Mapped[int] = mapped_column(ForeignKey("topics.topic_id"), nullable=False)
    vote_index: Mapped[int] = mapped_column(nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False
    )

    topic: Mapped["Topic"] = relationship("Topic", back_populates="votes")
    user: Mapped["User"] = relationship("User", back_populates="votes")
