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

# "rooms" added retroactively: the hosted DB has rooms.is_active, but this list omitted it, so a
# database built from migrations alone lacked it. Existing databases are past this revision.
TABLES = ["organizations", "departments", "stations", "wards", "beds", "rooms"]


def upgrade() -> None:
    for t in TABLES:
        op.add_column(
            t,
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        )
    # Also retroactive, matching the hosted DB (names identical): dept-level rooms — a room sits
    # under a department directly (department_id) or under a ward (ward_id, now optional).
    op.add_column("rooms", sa.Column("department_id", sa.Integer(), nullable=True))
    op.create_foreign_key("rooms_department_id_fkey", "rooms", "departments", ["department_id"], ["id"])
    op.create_index("ix_rooms_department_id", "rooms", ["department_id"])
    op.alter_column("rooms", "ward_id", existing_type=sa.Integer(), nullable=True)
    op.create_index("ix_rooms_ward_id", "rooms", ["ward_id"])


def downgrade() -> None:
    op.drop_index("ix_rooms_ward_id", table_name="rooms")
    op.alter_column("rooms", "ward_id", existing_type=sa.Integer(), nullable=False)
    op.drop_index("ix_rooms_department_id", table_name="rooms")
    op.drop_constraint("rooms_department_id_fkey", "rooms", type_="foreignkey")
    op.drop_column("rooms", "department_id")
    for t in reversed(TABLES):
        op.drop_column(t, "is_active")
