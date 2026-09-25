"""Add station_id to rooms (every room sits under a nursing station)

Revision ID: b7c1d2e3f4a5
Revises: f3fe22a66869
Create Date: 2026-09-24 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7c1d2e3f4a5'
down_revision: Union[str, None] = 'f3fe22a66869'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('rooms', sa.Column('station_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_rooms_station_id', 'rooms', 'stations', ['station_id'], ['id'])
    op.create_index('ix_rooms_station_id', 'rooms', ['station_id'])

    # Backfill: ward-level rooms inherit their ward's station. Dept-level rooms stay NULL
    # until an admin assigns one (the admin API requires it on any edit).
    op.execute(
        """
        UPDATE rooms SET station_id = wards.station_id
        FROM wards
        WHERE rooms.ward_id = wards.id AND rooms.station_id IS NULL
        """
    )


def downgrade() -> None:
    op.drop_index('ix_rooms_station_id', table_name='rooms')
    op.drop_constraint('fk_rooms_station_id', 'rooms', type_='foreignkey')
    op.drop_column('rooms', 'station_id')
