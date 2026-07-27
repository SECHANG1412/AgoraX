from __future__ import annotations

from datetime import datetime

from sqlalchemy import ForeignKey, Index, JSON, String, TIMESTAMP, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class Report(Base):
    __tablename__ = "reports"
    __table_args__ = (
        UniqueConstraint("reporter_user_id", "target_type", "target_id", name="uq_reports_reporter_target"),
        Index("ix_reports_status_created_at", "status", "created_at"),
        Index("ix_reports_target", "target_type", "target_id"),
    )

    report_id: Mapped[int] = mapped_column(primary_key=True, index=True)
    reporter_user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False)
    target_type: Mapped[str] = mapped_column(String(20), nullable=False)
    target_id: Mapped[int] = mapped_column(nullable=False)
    reason: Mapped[str] = mapped_column(String(30), nullable=False)
    detail: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending", server_default="pending")
    target_snapshot: Mapped[dict] = mapped_column(JSON, nullable=False)
    handled_by: Mapped[int | None] = mapped_column(ForeignKey("users.user_id"), nullable=True)
    handled_at: Mapped[datetime | None] = mapped_column(TIMESTAMP, nullable=True)
    resolution: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, server_default=func.now(), nullable=False)

    reporter: Mapped["User"] = relationship("User", foreign_keys=[reporter_user_id])
    handler: Mapped["User | None"] = relationship("User", foreign_keys=[handled_by])
