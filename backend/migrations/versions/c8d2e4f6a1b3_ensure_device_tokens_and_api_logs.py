"""Ensure device_tokens and api_logs exist

The hosted DB was stamped past 277d4877e8aa / aebaa432e47c without those tables being
created, so push registration and the heartbeat's api_log purge failed. Create them only
when missing, so this is a no-op on databases that already have them.

Revision ID: c8d2e4f6a1b3
Revises: b7c1d2e3f4a5
Create Date: 2026-09-24 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c8d2e4f6a1b3'
down_revision: Union[str, None] = 'b7c1d2e3f4a5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    existing = set(sa.inspect(op.get_bind()).get_table_names())

    if "device_tokens" not in existing:
        op.create_table(
            "device_tokens",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("token", sa.String(length=512), nullable=False),
            sa.Column("platform", sa.String(length=20), server_default="android", nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=True),
        )
        op.create_index("ix_device_tokens_user_id", "device_tokens", ["user_id"])
        op.create_index("ix_device_tokens_token", "device_tokens", ["token"], unique=True)

    if "api_logs" not in existing:
        op.create_table(
            "api_logs",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.Column("method", sa.String(length=10), nullable=False),
            sa.Column("path", sa.String(length=512), nullable=False),
            sa.Column("status_code", sa.Integer(), nullable=False),
            sa.Column("latency_ms", sa.Integer(), nullable=False),
            sa.Column("client_host", sa.String(length=64), nullable=True),
            sa.Column("request_id", sa.String(length=64), nullable=True),
            sa.Column("error_type", sa.String(length=128), nullable=True),
            sa.Column("error_detail", sa.Text(), nullable=True),
            sa.Column("traceback", sa.Text(), nullable=True),
        )
        op.create_index("ix_api_logs_created_at", "api_logs", ["created_at"])
        op.create_index("ix_api_logs_path", "api_logs", ["path"])
        op.create_index("ix_api_logs_status_code", "api_logs", ["status_code"])


def downgrade() -> None:
    # Intentionally a no-op: these tables belong to 277d4877e8aa / aebaa432e47c.
    pass
