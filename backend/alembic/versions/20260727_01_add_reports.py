"""Add content reports

Revision ID: 20260727_01_add_reports
Revises: 20251223_01_add_topic_closed_notified_at
Create Date: 2026-07-27
"""

from alembic import op
import sqlalchemy as sa


revision = "20260727_01_add_reports"
down_revision = "20251223_01_add_topic_closed_notified_at"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "reports",
        sa.Column("report_id", sa.Integer(), nullable=False),
        sa.Column("reporter_user_id", sa.Integer(), nullable=False),
        sa.Column("target_type", sa.String(length=20), nullable=False),
        sa.Column("target_id", sa.Integer(), nullable=False),
        sa.Column("reason", sa.String(length=30), nullable=False),
        sa.Column("detail", sa.String(length=500), nullable=True),
        sa.Column("status", sa.String(length=20), server_default="pending", nullable=False),
        sa.Column("target_snapshot", sa.JSON(), nullable=False),
        sa.Column("handled_by", sa.Integer(), nullable=True),
        sa.Column("handled_at", sa.TIMESTAMP(), nullable=True),
        sa.Column("resolution", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["handled_by"], ["users.user_id"]),
        sa.ForeignKeyConstraint(["reporter_user_id"], ["users.user_id"]),
        sa.PrimaryKeyConstraint("report_id"),
        sa.UniqueConstraint("reporter_user_id", "target_type", "target_id", name="uq_reports_reporter_target"),
    )
    op.create_index("ix_reports_report_id", "reports", ["report_id"], unique=False)
    op.create_index("ix_reports_status_created_at", "reports", ["status", "created_at"], unique=False)
    op.create_index("ix_reports_target", "reports", ["target_type", "target_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_reports_target", table_name="reports")
    op.drop_index("ix_reports_status_created_at", table_name="reports")
    op.drop_index("ix_reports_report_id", table_name="reports")
    op.drop_table("reports")
