"""vitals_archive: raw readings of discharged patients, moved out of `vitals`

Same columns as `vitals` plus archived_at. app.services.archive moves a discharged patient's
rows here on a schedule (ARCHIVE_DAYS / ARCHIVE_TIME) and back when they are readmitted.
Ids are copied, so no sequence; one index, since archived rows are only read per patient.

Revision ID: b2c4d6e8f0a2
Revises: a1b3c5d7e9f1
Create Date: 2026-10-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c4d6e8f0a2'
down_revision: Union[str, None] = 'a1b3c5d7e9f1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'vitals_archive',
        sa.Column('id', sa.Integer(), autoincrement=False, nullable=False),
        sa.Column('patient_id', sa.Integer(), nullable=True),
        sa.Column('device_id', sa.String(), nullable=True),
        sa.Column('heart_rate', sa.Integer(), nullable=True),
        sa.Column('spo2', sa.Float(), nullable=True),
        sa.Column('temp', sa.Float(), nullable=True),
        sa.Column('bp_systolic', sa.Integer(), nullable=True),
        sa.Column('bp_diastolic', sa.Integer(), nullable=True),
        sa.Column('news2_score', sa.Integer(), nullable=True),
        sa.Column('af_warning', sa.String(), nullable=True),
        sa.Column('stroke_risk', sa.String(), nullable=True),
        sa.Column('seizure_risk', sa.String(), nullable=True),
        sa.Column('hrv_score', sa.Integer(), nullable=True),
        sa.Column('stress_level', sa.String(), nullable=True),
        sa.Column('movement', sa.Integer(), nullable=True),
        sa.Column('sleep_pattern', sa.String(), nullable=True),
        sa.Column('battery_percent', sa.Integer(), nullable=True),
        sa.Column('phone_battery', sa.Integer(), nullable=True),
        sa.Column('is_connected', sa.Boolean(), nullable=True),
        sa.Column('is_removed', sa.Boolean(), nullable=True),
        sa.Column('source', sa.String(10), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('archived_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['patient_id'], ['patients.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_vitals_archive_patient_id_created_at', 'vitals_archive', ['patient_id', 'created_at'])


def downgrade() -> None:
    # Refuse to drop archived readings: restore them into `vitals` first (readmit, or move back by hand).
    op.execute("""
        DO $$ BEGIN
            IF EXISTS (SELECT 1 FROM vitals_archive) THEN
                RAISE EXCEPTION 'vitals_archive still holds readings; move them back to vitals before downgrading';
            END IF;
        END $$;
    """)
    op.drop_index('ix_vitals_archive_patient_id_created_at', table_name='vitals_archive')
    op.drop_table('vitals_archive')
