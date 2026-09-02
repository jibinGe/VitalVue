"""rooms: add department_id, make ward_id nullable (dept-level room support)

Revision ID: b1c2d3e4f5a6
Revises: a9b2c3d4e5f6
Create Date: 2026-09-02

Two topologies are now supported for Rooms:
  A) Dept-level room  → department_id IS SET,  ward_id IS NULL
  B) Ward-level room  → ward_id IS SET,         department_id IS NULL  (legacy)

Changes:
  - rooms.ward_id: NOT NULL → nullable  (existing rows keep their ward_id value)
  - rooms.department_id: new nullable FK → departments.id
"""
from alembic import op
import sqlalchemy as sa

revision = "b1c2d3e4f5a6"
down_revision = "a9b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Make ward_id nullable (existing rows are unaffected — they still have their ward_id)
    op.alter_column("rooms", "ward_id", nullable=True)
    # 2. Add department_id FK (nullable — only set for dept-level rooms)
    op.add_column(
        "rooms",
        sa.Column("department_id", sa.Integer(), sa.ForeignKey("departments.id"), nullable=True, index=True),
    )


def downgrade() -> None:
    op.drop_column("rooms", "department_id")
    # Restore NOT NULL only if all rows have a ward_id (safe to revert if none were dept-level)
    op.alter_column("rooms", "ward_id", nullable=False)
