"""api_logs

Revision ID: aebaa432e47c
Revises: 277d4877e8aa
Create Date: 2026-06-26 18:48:46.076167

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'aebaa432e47c'
down_revision: Union[str, None] = '277d4877e8aa'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
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
    op.drop_index("ix_api_logs_status_code", table_name="api_logs")
    op.drop_index("ix_api_logs_path", table_name="api_logs")
    op.drop_index("ix_api_logs_created_at", table_name="api_logs")
    op.drop_table("api_logs")
