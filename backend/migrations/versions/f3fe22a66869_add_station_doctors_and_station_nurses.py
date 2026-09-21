"""Add station_doctors and station_nurses junction tables

Revision ID: f3fe22a66869
Revises: 4297a0addd08
Create Date: 2026-09-21 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f3fe22a66869'
down_revision: Union[str, None] = '4297a0addd08'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'station_doctors',
        sa.Column('station_id', sa.Integer(), nullable=False),
        sa.Column('doctor_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['station_id'], ['stations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['doctor_id'], ['doctors.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('station_id', 'doctor_id'),
    )
    op.create_index('ix_station_doctors_doctor_id', 'station_doctors', ['doctor_id'])

    op.create_table(
        'station_nurses',
        sa.Column('station_id', sa.Integer(), nullable=False),
        sa.Column('nurse_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['station_id'], ['stations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['nurse_id'], ['nurses.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('station_id', 'nurse_id'),
    )
    op.create_index('ix_station_nurses_nurse_id', 'station_nurses', ['nurse_id'])


def downgrade() -> None:
    op.drop_index('ix_station_nurses_nurse_id', table_name='station_nurses')
    op.drop_table('station_nurses')
    op.drop_index('ix_station_doctors_doctor_id', table_name='station_doctors')
    op.drop_table('station_doctors')
