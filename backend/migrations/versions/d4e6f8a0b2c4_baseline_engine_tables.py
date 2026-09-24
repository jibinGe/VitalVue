"""Baseline Engine v1: vital_observations, patient_baselines, vitals(patient_id, created_at) index

Revision ID: d4e6f8a0b2c4
Revises: c8d2e4f6a1b3
Create Date: 2026-09-24 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'd4e6f8a0b2c4'
down_revision: Union[str, None] = 'c8d2e4f6a1b3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'vital_observations',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('patient_id', sa.Integer(), sa.ForeignKey('patients.id'), nullable=False),
        sa.Column('window_start', sa.DateTime(), nullable=False),
        sa.Column('window_end', sa.DateTime(), nullable=False),
        sa.Column('sample_count', sa.Integer(), nullable=False),
        sa.Column('good_ratio', sa.Float(), nullable=False),
        sa.Column('hr', sa.Float(), nullable=True),
        sa.Column('hrv', sa.Float(), nullable=True),
        sa.Column('sbp', sa.Float(), nullable=True),
        sa.Column('dbp', sa.Float(), nullable=True),
        sa.Column('map', sa.Float(), nullable=True),
        sa.Column('spo2', sa.Float(), nullable=True),
        sa.Column('stress', sa.Float(), nullable=True),
        sa.Column('movement', sa.Float(), nullable=True),
        sa.Column('activity_state', sa.String(length=20), nullable=True),
        sa.Column('signal_quality', sa.String(length=20), nullable=False),
        sa.Column('is_stable', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('reject_reason', sa.String(length=64), nullable=True),
        sa.Column('baseline_version', sa.Integer(), nullable=True),
        sa.Column('vpo', postgresql.JSONB(), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.UniqueConstraint('patient_id', 'window_start', name='uq_vital_observations_patient_window'),
    )
    op.create_index('ix_vital_observations_patient_id', 'vital_observations', ['patient_id'])
    op.create_index('ix_vital_observations_window_start', 'vital_observations', ['window_start'])

    op.create_table(
        'patient_baselines',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('patient_id', sa.Integer(), sa.ForeignKey('patients.id'), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False),
        sa.Column('mode', sa.String(length=20), nullable=False),
        sa.Column('episode_start', sa.DateTime(), nullable=False),
        sa.Column('stats', postgresql.JSONB(), nullable=False, server_default='{}'),
        sa.Column('n_stable', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('confidence', sa.Float(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.UniqueConstraint('patient_id', 'version', name='uq_patient_baselines_patient_version'),
    )
    op.create_index('ix_patient_baselines_patient_id', 'patient_baselines', ['patient_id'])

    # The engine reads 10-minute slices of `vitals` per patient. Build the composite index
    # CONCURRENTLY (outside the migration transaction) so ingest keeps writing meanwhile.
    with op.get_context().autocommit_block():
        op.create_index(
            'ix_vitals_patient_id_created_at', 'vitals', ['patient_id', 'created_at'],
            postgresql_concurrently=True, if_not_exists=True,
        )


def downgrade() -> None:
    with op.get_context().autocommit_block():
        op.drop_index('ix_vitals_patient_id_created_at', table_name='vitals',
                      postgresql_concurrently=True, if_exists=True)
    op.drop_index('ix_patient_baselines_patient_id', table_name='patient_baselines')
    op.drop_table('patient_baselines')
    op.drop_index('ix_vital_observations_window_start', table_name='vital_observations')
    op.drop_index('ix_vital_observations_patient_id', table_name='vital_observations')
    op.drop_table('vital_observations')
