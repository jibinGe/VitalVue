"""add is_active to org-hierarchy entities (soft-disable)

Revision ID: f1d2e3a4b5c6
Revises: aebaa432e47c
Create Date: 2026-06-27

Adds a soft-disable flag to organizations/departments/stations/wards/beds so admins
can hide an entity from pickers/assignment without deleting it (preserves FK history).
Staff (doctor/nurse) already have users.is_active. Additive + reversible.
"""
from alembic import op
import sqlalchemy as sa

revision = "f1d2e3a4b5c6"
down_revision = "aebaa432e47c"
branch_labels = None
depends_on = None

TABLES = ["organizations", "departments", "stations", "wards", "beds"]


def upgrade() -> None:
    for t in TABLES:
        op.add_column(
            t,
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        )


def downgrade() -> None:
    for t in reversed(TABLES):
        op.drop_column(t, "is_active")
