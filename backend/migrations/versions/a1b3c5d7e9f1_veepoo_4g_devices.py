"""Veepoo 4G watches: devices, assignments, monitoring schedules, raw MQTT log, vitals.source

Additive only — the BLE path is unaffected. vitals.source is added with a constant server
default, which Postgres 11+ stores as metadata (no rewrite of the 4M-row table).

Revision ID: a1b3c5d7e9f1
Revises: f7a9b1c3d5e7
Create Date: 2026-09-29 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'a1b3c5d7e9f1'
down_revision: Union[str, None] = 'f7a9b1c3d5e7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'devices',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('type', sa.String(20), nullable=False, server_default='veepoo_4g'),
        sa.Column('client_id', sa.String(64), nullable=False),
        sa.Column('mac', sa.String(17), nullable=True),
        sa.Column('device_number', sa.Integer(), nullable=True),
        sa.Column('mqtt_password_hash', sa.String(255), nullable=True),
        sa.Column('organization_id', sa.Integer(), sa.ForeignKey('organizations.id'), nullable=True),
        sa.Column('patient_id', sa.Integer(), sa.ForeignKey('patients.id'), nullable=True),
        sa.Column('firmware', sa.String(20), nullable=True),
        sa.Column('hardware', sa.String(20), nullable=True),
        sa.Column('iccid', sa.String(32), nullable=True),
        sa.Column('timezone_minutes', sa.Integer(), nullable=True),
        sa.Column('capabilities', postgresql.JSONB(), nullable=False, server_default='{}'),
        sa.Column('battery_percent', sa.Integer(), nullable=True),
        sa.Column('battery_state', sa.String(20), nullable=True),
        sa.Column('is_online', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('last_seen_at', sa.DateTime(), nullable=True),
        sa.Column('last_connected_at', sa.DateTime(), nullable=True),
        sa.Column('duplicate_login_at', sa.DateTime(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_devices_client_id', 'devices', ['client_id'], unique=True)
    op.create_index('ix_devices_patient_id', 'devices', ['patient_id'])

    op.create_table(
        'device_assignments',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('device_id', sa.Integer(), sa.ForeignKey('devices.id'), nullable=False),
        sa.Column('patient_id', sa.Integer(), sa.ForeignKey('patients.id'), nullable=False),
        sa.Column('assigned_at', sa.DateTime(), nullable=True),
        sa.Column('unassigned_at', sa.DateTime(), nullable=True),
        sa.Column('assigned_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
    )
    op.create_index('ix_device_assignments_device_id', 'device_assignments', ['device_id'])
    op.create_index('ix_device_assignments_patient_id', 'device_assignments', ['patient_id'])

    op.create_table(
        'monitoring_profiles',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('patient_id', sa.Integer(), sa.ForeignKey('patients.id'), nullable=True),
        sa.Column('hr_interval_min', sa.Integer(), nullable=True),
        sa.Column('bp_interval_min', sa.Integer(), nullable=True),
        sa.Column('spo2_interval_min', sa.Integer(), nullable=True),
        sa.Column('temp_interval_min', sa.Integer(), nullable=True),
        sa.Column('hrv_interval_min', sa.Integer(), nullable=True),
        sa.Column('stress_interval_min', sa.Integer(), nullable=True),
        sa.Column('upload_interval_min', sa.Integer(), nullable=False, server_default='5'),
        sa.Column('window_start', sa.String(5), nullable=True),
        sa.Column('window_end', sa.String(5), nullable=True),
        sa.Column('updated_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )
    # One row per patient and exactly one default row (patient_id NULL).
    op.execute("CREATE UNIQUE INDEX uq_monitoring_profiles_patient ON monitoring_profiles ((coalesce(patient_id, 0)))")
    # The default schedule for every 4G patient (editable in the admin UI).
    op.execute("""
        INSERT INTO monitoring_profiles (patient_id, hr_interval_min, bp_interval_min, spo2_interval_min,
            temp_interval_min, hrv_interval_min, stress_interval_min, upload_interval_min, updated_at)
        VALUES (NULL, 5, 60, 5, 30, 30, 30, 5, now() at time zone 'utc')
    """)

    op.create_table(
        'device_config_states',
        sa.Column('device_id', sa.Integer(), sa.ForeignKey('devices.id'), primary_key=True),
        sa.Column('profile_hash', sa.String(64), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('attempts', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_sent_at', sa.DateTime(), nullable=True),
        sa.Column('applied_at', sa.DateTime(), nullable=True),
        sa.Column('last_error', sa.String(255), nullable=True),
        sa.Column('device_limits', postgresql.JSONB(), nullable=False, server_default='{}'),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )

    op.create_table(
        'mqtt_raw_messages',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('client_id', sa.String(64), nullable=False),
        sa.Column('patient_id', sa.Integer(), nullable=True),
        sa.Column('topic', sa.String(128), nullable=False),
        sa.Column('head', sa.Integer(), nullable=True),
        sa.Column('payload', sa.LargeBinary(), nullable=False),
        sa.Column('parse_status', sa.String(20), nullable=False, server_default='received'),
        sa.Column('parse_error', sa.String(255), nullable=True),
        sa.Column('received_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_mqtt_raw_messages_client_id', 'mqtt_raw_messages', ['client_id'])
    op.create_index('ix_mqtt_raw_messages_received_at', 'mqtt_raw_messages', ['received_at'])

    op.create_table(
        'device_data_blocks',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('device_id', sa.Integer(), sa.ForeignKey('devices.id'), nullable=False),
        sa.Column('day', sa.String(10), nullable=False),
        sa.Column('block_no', sa.Integer(), nullable=False),
        sa.Column('crc', sa.Integer(), nullable=False),
        sa.Column('measured_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.UniqueConstraint('device_id', 'day', 'block_no', 'crc', name='uq_device_data_blocks'),
    )
    op.create_index('ix_device_data_blocks_device_id', 'device_data_blocks', ['device_id'])

    # Constant default → metadata-only change on Postgres 11+, no table rewrite. It still needs a
    # brief exclusive lock on the busy vitals table: give up after 5 s instead of queueing behind a
    # long-running query (which would block all ingest meanwhile). If it times out, nothing is
    # changed — just rerun the migration.
    op.execute("SET LOCAL lock_timeout = '5s'")
    op.add_column('vitals', sa.Column('source', sa.String(10), nullable=True, server_default='ble'))


def downgrade() -> None:
    op.drop_column('vitals', 'source')
    op.drop_index('ix_device_data_blocks_device_id', table_name='device_data_blocks')
    op.drop_table('device_data_blocks')
    op.drop_index('ix_mqtt_raw_messages_received_at', table_name='mqtt_raw_messages')
    op.drop_index('ix_mqtt_raw_messages_client_id', table_name='mqtt_raw_messages')
    op.drop_table('mqtt_raw_messages')
    op.drop_table('device_config_states')
    op.execute("DROP INDEX IF EXISTS uq_monitoring_profiles_patient")
    op.drop_table('monitoring_profiles')
    op.drop_index('ix_device_assignments_patient_id', table_name='device_assignments')
    op.drop_index('ix_device_assignments_device_id', table_name='device_assignments')
    op.drop_table('device_assignments')
    op.drop_index('ix_devices_patient_id', table_name='devices')
    op.drop_index('ix_devices_client_id', table_name='devices')
    op.drop_table('devices')
