"""Add parent_reply_id to replies for nested threading

Revision ID: 20251206_01
Revises: 20251210_00_init
Create Date: 2025-12-06
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20251206_01"
down_revision = "20251210_00_init"
branch_labels = None
depends_on = None


def upgrade():
  op.add_column(
      "replies",
      sa.Column("parent_reply_id", sa.Integer(), nullable=True),
  )
  op.create_foreign_key(
      "fk_replies_parent_reply",
      "replies",
      "replies",
      ["parent_reply_id"],
      ["reply_id"],
      ondelete="CASCADE",
  )


def downgrade():
  op.drop_constraint("fk_replies_parent_reply", "replies", type_="foreignkey")
  op.drop_column("replies", "parent_reply_id")
