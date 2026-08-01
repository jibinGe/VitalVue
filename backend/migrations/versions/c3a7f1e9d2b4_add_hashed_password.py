"""add hashed_password to users (patient 6-digit PIN login)

Revision ID: c3a7f1e9d2b4
Revises: f1d2e3a4b5c6
Create Date: 2026-07-02

Adds a nullable hashed_password column to users so patients can log in with an
auto-generated PAT-<id> + a 6-digit PIN set at registration (hashed with bcrypt).
Additive + reversible. Staff keep OTP login; only patients use the PIN path.
"""
from alembic import op
import sqlalchemy as sa

revision = "c3a7f1e9d2b4"
down_revision = "f1d2e3a4b5c6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("hashed_password", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "hashed_password")
