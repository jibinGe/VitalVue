"""TCP 4G watches (Wonlex, CLOC BPW8) and hospital-level default schedules

Additive only — Veepoo and BLE are unaffected:
- devices: transport, model, sim_phone, reported_config, last_ip
- mqtt_raw_messages.transport (the raw log now also holds TCP frames)
- device_message_keys: dedupe for uploads a watch resends after a missed reply
- monitoring_profiles.organization_id: a default schedule per hospital, between the patient
  override and the global default. The single coalesce(patient_id, 0) unique index is replaced
  by three partial ones (one row per patient / per hospital / one global row).

Revision ID: c3e5a7b9d1f3
Revises: b2c4d6e8f0a2
Create Date: 2026-10-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'c3e5a7b9d1f3'
down_revision: Union[str, None] = 'b2c4d6e8f0a2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # The raw log can be large; a constant default is metadata-only on Postgres 11+, and the
    # lock timeout keeps this from queueing behind a long query. If it times out, rerun it.
    op.execute("SET LOCAL lock_timeout = '5s'")
    op.add_column('mqtt_raw_messages', sa.Column('transport', sa.String(10), nullable=False, server_default='mqtt'))

    op.add_column('devices', sa.Column('transport', sa.String(10), nullable=False, server_default='mqtt'))
    op.add_column('devices', sa.Column('model', sa.String(40), nullable=True))
    op.add_column('devices', sa.Column('sim_phone', sa.String(20), nullable=True))
    op.add_column('devices', sa.Column('reported_config', postgresql.JSONB(), nullable=False, server_default='{}'))
    op.add_column('devices', sa.Column('last_ip', sa.String(45), nullable=True))

    op.create_table(
        'device_message_keys',
        sa.Column('device_id', sa.Integer(), sa.ForeignKey('devices.id'), primary_key=True),
        sa.Column('dedupe_key', sa.String(64), primary_key=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text("(now() at time zone 'utc')")),
    )
    op.create_index('ix_device_message_keys_created_at', 'device_message_keys', ['created_at'])

    op.add_column('monitoring_profiles',
                  sa.Column('organization_id', sa.Integer(), sa.ForeignKey('organizations.id'), nullable=True))
    op.execute("DROP INDEX IF EXISTS uq_monitoring_profiles_patient")
    op.execute("CREATE UNIQUE INDEX uq_monitoring_profiles_patient ON monitoring_profiles (patient_id) "
               "WHERE patient_id IS NOT NULL")
    op.execute("CREATE UNIQUE INDEX uq_monitoring_profiles_org ON monitoring_profiles (organization_id) "
               "WHERE patient_id IS NULL AND organization_id IS NOT NULL")
    op.execute("CREATE UNIQUE INDEX uq_monitoring_profiles_global ON monitoring_profiles ((1)) "
               "WHERE patient_id IS NULL AND organization_id IS NULL")


def downgrade() -> None:
    # Hospital defaults have no place in the old schema; drop them before restoring its index.
    op.execute("DELETE FROM monitoring_profiles WHERE patient_id IS NULL AND organization_id IS NOT NULL")
    op.execute("DROP INDEX IF EXISTS uq_monitoring_profiles_global")
    op.execute("DROP INDEX IF EXISTS uq_monitoring_profiles_org")
    op.execute("DROP INDEX IF EXISTS uq_monitoring_profiles_patient")
    op.execute("CREATE UNIQUE INDEX uq_monitoring_profiles_patient ON monitoring_profiles ((coalesce(patient_id, 0)))")
    op.drop_column('monitoring_profiles', 'organization_id')

    op.drop_index('ix_device_message_keys_created_at', table_name='device_message_keys')
    op.drop_table('device_message_keys')

    op.drop_column('devices', 'last_ip')
    op.drop_column('devices', 'reported_config')
    op.drop_column('devices', 'sim_phone')
    op.drop_column('devices', 'model')
    op.drop_column('devices', 'transport')
    op.drop_column('mqtt_raw_messages', 'transport')
