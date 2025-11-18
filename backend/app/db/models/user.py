from __future__ import annotations
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, TIMESTAMP, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base


class User(Base):
    __tablename__ = "users"

    user_id: Mapped[int] = mapped_column(primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(50), nullable=False)
    email: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    password: Mapped[str] = mapped_column(String(255), nullable=False)
    refresh_token: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP, server_default=func.now(), nullable=True)

    topics: Mapped[List["Topic"]] = relationship(
        "Topic", back_populates="user", cascade="all, delete-orphan"
    )
    votes: Mapped[list["Vote"]] = relationship("Vote", back_populates="user", cascade="all, delete-orphan")
    comments: Mapped[list["Comment"]] = relationship("Comment", back_populates="user", cascade="all, delete-orphan")