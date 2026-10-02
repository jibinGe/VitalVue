"""Extra 4G watch data: patient_metrics, sleep_sessions, device_locations

Additive only. Values that don't feed NEWS2 (respiratory rate, glucose, lipids, uric acid,
steps, kcal, ambient/surface temperature, raw RR intervals) go to patient_metrics instead of
widening the 4M-row vitals table. One sleep row per watch per night (updated as the watch
re-reports it). Locations are kept 30 days.

Revision ID: e7a9c1b3d5f7
Revises: c3e5a7b9d1f3
Create Date: 2026-10-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'e7a9c1b3d5f7'
down_revision: Union[str, None] = 'c3e5a7b9d1f3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'patient_metrics',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('patient_id', sa.Integer(), sa.ForeignKey('patients.id'), nullable=False),
        sa.Column('device_id', sa.Integer(), sa.ForeignKey('devices.id'), nullable=True),
        sa.Column('kind', sa.String(20), nullable=False),
        sa.Column('value', sa.Float(), nullable=True),
        sa.Column('value_text', sa.String(2000), nullable=True),
        sa.Column('unit', sa.String(12), nullable=True),
        sa.Column('source', sa.String(10), nullable=True),
        sa.Column('measured_at', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text("(now() at time zone 'utc')")),
    )
    op.create_index('ix_patient_metrics_patient_kind_time', 'patient_metrics', ['patient_id', 'kind', 'measured_at'])

    op.create_table(
        'sleep_sessions',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('patient_id', sa.Integer(), sa.ForeignKey('patients.id'), nullable=False),
        sa.Column('device_id', sa.Integer(), sa.ForeignKey('devices.id'), nullable=False),
        sa.Column('night', sa.Date(), nullable=False),            # local date the sleep ended on
        sa.Column('start_at', sa.DateTime(), nullable=True),
        sa.Column('end_at', sa.DateTime(), nullable=True),
        sa.Column('deep_min', sa.Integer(), nullable=True),
        sa.Column('light_min', sa.Integer(), nullable=True),
        sa.Column('rem_min', sa.Integer(), nullable=True),
        sa.Column('awake_min', sa.Integer(), nullable=True),
        sa.Column('total_min', sa.Integer(), nullable=True),
        sa.Column('segments', postgresql.JSONB(), nullable=False, server_default='[]'),
        sa.Column('source', sa.String(10), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.UniqueConstraint('device_id', 'night', name='uq_sleep_sessions_device_night'),
    )
    op.create_index('ix_sleep_sessions_patient_night', 'sleep_sessions', ['patient_id', 'night'])

    op.create_table(
        'device_locations',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('device_id', sa.Integer(), sa.ForeignKey('devices.id'), nullable=False),
        sa.Column('patient_id', sa.Integer(), nullable=True),
        sa.Column('recorded_at', sa.DateTime(), nullable=False),
        sa.Column('lat', sa.Float(), nullable=True),
        sa.Column('lon', sa.Float(), nullable=True),
        sa.Column('source', sa.String(10), nullable=True),        # gps | wifi | cell | unknown
        sa.Column('reason', sa.String(12), nullable=True),        # scheduled | query | sos | fall
        sa.Column('raw', postgresql.JSONB(), nullable=False, server_default='{}'),
    )
    op.create_index('ix_device_locations_device_time', 'device_locations', ['device_id', 'recorded_at'])
    op.create_index('ix_device_locations_patient_time', 'device_locations', ['patient_id', 'recorded_at'])


def downgrade() -> None:
    op.drop_index('ix_device_locations_patient_time', table_name='device_locations')
    op.drop_index('ix_device_locations_device_time', table_name='device_locations')
    op.drop_table('device_locations')
    op.drop_index('ix_sleep_sessions_patient_night', table_name='sleep_sessions')
    op.drop_table('sleep_sessions')
    op.drop_index('ix_patient_metrics_patient_kind_time', table_name='patient_metrics')
    op.drop_table('patient_metrics')
