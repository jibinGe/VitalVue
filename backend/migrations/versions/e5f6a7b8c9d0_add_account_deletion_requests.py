"""add account_deletion_requests table (public web deletion form)

Revision ID: e5f6a7b8c9d0
Revises: c3a7f1e9d2b4
Create Date: 2026-07-05

Backs the public account-deletion request page (Google Play data-deletion requirement).
Additive + reversible. No auth to submit; staff review pending rows and action deletion.
"""
from alembic import op
import sqlalchemy as sa

revision = "e5f6a7b8c9d0"
down_revision = "c3a7f1e9d2b4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "account_deletion_requests",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("identifier", sa.String(length=128), nullable=False),
        sa.Column("contact_email", sa.String(length=255), nullable=True),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("matched_user_id", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_account_deletion_requests_id", "account_deletion_requests", ["id"])
    op.create_index("ix_account_deletion_requests_identifier", "account_deletion_requests", ["identifier"])
    op.create_index("ix_account_deletion_requests_status", "account_deletion_requests", ["status"])
    op.create_index("ix_account_deletion_requests_created_at", "account_deletion_requests", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_account_deletion_requests_created_at", table_name="account_deletion_requests")
    op.drop_index("ix_account_deletion_requests_status", table_name="account_deletion_requests")
    op.drop_index("ix_account_deletion_requests_identifier", table_name="account_deletion_requests")
    op.drop_index("ix_account_deletion_requests_id", table_name="account_deletion_requests")
    op.drop_table("account_deletion_requests")
