"""Vitals query performance: SSD planner cost + index for disconnected readings

Two production slowdowns on the 4M-row `vitals` table:
- "latest N readings for a patient" (patients/assigned, patient detail) was planned on the
  global created_at index, scanning millions of rows backwards for patients whose band had
  gone quiet. random_page_cost = 1.1 (SSD storage) makes the planner use
  ix_vitals_patient_id_created_at instead.
- ingest's "last failure" lookup read every disconnected/removed reading of the patient.
  A partial index on exactly those rows makes it an index-only lookup.

Revision ID: f7a9b1c3d5e7
Revises: e6f8a0b2c4d6
Create Date: 2026-09-26 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'f7a9b1c3d5e7'
down_revision: Union[str, None] = 'e6f8a0b2c4d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

FAILURE_PREDICATE = "is_connected = false OR is_removed = true"


def upgrade() -> None:
    # Applies to new connections; restart backends (or let the pool recycle) to pick it up.
    op.execute("""
        DO $$ BEGIN
            EXECUTE format('ALTER DATABASE %I SET random_page_cost = 1.1', current_database());
        END $$;
    """)
    with op.get_context().autocommit_block():
        op.execute(
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_vitals_patient_failures "
            f"ON vitals (patient_id, created_at) WHERE ({FAILURE_PREDICATE})"
        )


def downgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute("DROP INDEX CONCURRENTLY IF EXISTS ix_vitals_patient_failures")
    op.execute("""
        DO $$ BEGIN
            EXECUTE format('ALTER DATABASE %I RESET random_page_cost', current_database());
        END $$;
    """)
