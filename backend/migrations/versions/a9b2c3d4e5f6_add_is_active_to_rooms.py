"""add is_active to rooms table

Revision ID: a9b2c3d4e5f6
Revises: f1d2e3a4b5c6
Create Date: 2026-09-02

Adds a soft-disable flag to rooms (parity with beds) so admins can hide a room
from pickers/assignment without deleting it (preserves FK history for patient records).
Additive + reversible.
"""
from alembic import op
import sqlalchemy as sa

revision = "a9b2c3d4e5f6"
down_revision = "f1d2e3a4b5c6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "rooms",
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )


def downgrade() -> None:
    op.drop_column("rooms", "is_active")
