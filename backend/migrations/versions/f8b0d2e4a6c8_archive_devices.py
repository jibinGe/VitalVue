"""Archive 4G watches: devices.archived_at / archived_by / archive_reason

A watch that has been used can't be deleted without losing which patient wore it when, so it
is archived instead: disabled, unlinked and hidden, with its history kept. Additive only.

Revision ID: f8b0d2e4a6c8
Revises: e7a9c1b3d5f7
Create Date: 2026-10-02 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f8b0d2e4a6c8'
down_revision: Union[str, None] = 'e7a9c1b3d5f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('devices', sa.Column('archived_at', sa.DateTime(), nullable=True))
    op.add_column('devices', sa.Column('archived_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=True))
    op.add_column('devices', sa.Column('archive_reason', sa.String(200), nullable=True))
    op.create_index('ix_devices_archived_at', 'devices', ['archived_at'])


def downgrade() -> None:
    op.drop_index('ix_devices_archived_at', table_name='devices')
    op.drop_column('devices', 'archive_reason')
    op.drop_column('devices', 'archived_by')
    op.drop_column('devices', 'archived_at')
