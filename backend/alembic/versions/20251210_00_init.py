"""Initial schema based on current models

Revision ID: 20251210_00_init
Revises: None
Create Date: 2025-12-10
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql


# revision identifiers, used by Alembic.
revision = "20251210_00_init"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("user_id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("username", sa.String(length=50), nullable=False),
        sa.Column("email", sa.String(length=100), nullable=False),
        sa.Column("password", sa.String(length=255), nullable=False),
        sa.Column("refresh_token", sa.String(length=255), nullable=True),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(),
            server_default=sa.func.now(),
            nullable=True,
        ),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_users_email", "users", ["email"])

    op.create_table(
        "topics",
        sa.Column("topic_id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=True),
        sa.Column("vote_options", mysql.JSON(), nullable=False),
        sa.Column(
            "category",
            sa.String(length=255),
            server_default=sa.text("'旮绊?'"),
            nullable=False,
        ),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.user_id"), nullable=False),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    op.create_table(
        "votes",
        sa.Column("vote_id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.user_id"), nullable=False),
        sa.Column("topic_id", sa.Integer(), sa.ForeignKey("topics.topic_id"), nullable=False),
        sa.Column("vote_index", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    op.create_table(
        "comments",
        sa.Column("comment_id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.user_id"), nullable=False),
        sa.Column("topic_id", sa.Integer(), sa.ForeignKey("topics.topic_id"), nullable=False),
        sa.Column("content", sa.String(length=500), nullable=False),
        sa.Column(
            "is_deleted",
            sa.Boolean(),
            server_default=sa.text("0"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    op.create_table(
        "replies",
        sa.Column("reply_id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.user_id"), nullable=False),
        sa.Column(
            "comment_id",
            sa.Integer(),
            sa.ForeignKey("comments.comment_id"),
            nullable=False,
        ),
        sa.Column(
            "parent_reply_id",
            sa.Integer(),
            sa.ForeignKey("replies.reply_id"),
            nullable=True,
        ),
        sa.Column("content", sa.String(length=500), nullable=False),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    op.create_table(
        "topic_likes",
        sa.Column("like_id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.user_id"), nullable=False),
        sa.Column("topic_id", sa.Integer(), sa.ForeignKey("topics.topic_id"), nullable=False),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("user_id", "topic_id", name="unique_topic_like"),
    )

    op.create_table(
        "comment_likes",
        sa.Column("like_id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.user_id"), nullable=False),
        sa.Column(
            "comment_id",
            sa.Integer(),
            sa.ForeignKey("comments.comment_id"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("user_id", "comment_id", name="unique_comment_like"),
    )

    op.create_table(
        "reply_likes",
        sa.Column("like_id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.user_id"), nullable=False),
        sa.Column("reply_id", sa.Integer(), sa.ForeignKey("replies.reply_id"), nullable=False),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("user_id", "reply_id", name="unique_reply_like"),
    )

    op.create_table(
        "pinned_topics",
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.user_id"), primary_key=True, nullable=False),
        sa.Column("topic_id", sa.Integer(), sa.ForeignKey("topics.topic_id"), primary_key=True, nullable=False),
        sa.Column(
            "pinned_at",
            sa.TIMESTAMP(),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_table("pinned_topics")
    op.drop_table("reply_likes")
    op.drop_table("comment_likes")
    op.drop_table("topic_likes")
    op.drop_table("replies")
    op.drop_table("comments")
    op.drop_table("votes")
    op.drop_table("topics")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
