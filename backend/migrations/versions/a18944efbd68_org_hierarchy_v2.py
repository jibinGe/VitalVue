"""org hierarchy v2

Revision ID: a18944efbd68
Revises: d8958e96c0c1
Create Date: 2026-06-26 13:06:11.073187

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'a18944efbd68'
down_revision: Union[str, None] = 'd8958e96c0c1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- geo on organizations ---
    op.add_column("organizations", sa.Column("latitude", sa.Float(), nullable=True))
    op.add_column("organizations", sa.Column("longitude", sa.Float(), nullable=True))

    # --- new Station level (under department) ---
    op.create_table(
        "stations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("station_no", sa.String(length=50), nullable=True),
        sa.Column("department_id", sa.Integer(), sa.ForeignKey("departments.id"), nullable=False),
    )
    op.create_index("ix_stations_department_id", "stations", ["department_id"])

    # --- ward gains station_id + ward_no ---
    op.add_column("wards", sa.Column("ward_no", sa.String(length=50), nullable=True))
    op.add_column("wards", sa.Column("station_id", sa.Integer(), sa.ForeignKey("stations.id"), nullable=True))
    op.create_index("ix_wards_station_id", "wards", ["station_id"])

    # --- new Bed leaf (replaces room as the patient location) ---
    op.create_table(
        "beds",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("bed_no", sa.String(length=50), nullable=False),
        sa.Column("ward_id", sa.Integer(), sa.ForeignKey("wards.id"), nullable=False),
        sa.Column("is_occupied", sa.Boolean(), server_default=sa.false(), nullable=False),
    )
    op.create_index("ix_beds_ward_id", "beds", ["ward_id"])

    # --- doctor.department_id ---
    op.add_column("doctors", sa.Column("department_id", sa.Integer(), sa.ForeignKey("departments.id"), nullable=True))
    op.create_index("ix_doctors_department_id", "doctors", ["department_id"])

    # --- patient.bed_id + comorbidities ---
    op.add_column("patients", sa.Column("bed_id", sa.Integer(), sa.ForeignKey("beds.id"), nullable=True))
    op.add_column("patients", sa.Column("comorbidities", postgresql.JSONB(), server_default="[]", nullable=False))

    # --- backfill: keep existing data working under the new hierarchy ---
    # one default station per department; existing wards point at it
    op.execute("INSERT INTO stations (name, station_no, department_id) SELECT 'Station 1', '1', id FROM departments")
    op.execute("UPDATE wards w SET station_id = s.id FROM stations s WHERE s.department_id = w.department_id")
    # one bed per existing room; patients move room_id -> bed_id (DISTINCT ON guards dup room_number per ward)
    op.execute("INSERT INTO beds (bed_no, ward_id, is_occupied) SELECT room_number, ward_id, COALESCE(is_occupied, false) FROM rooms")
    op.execute("""
        UPDATE patients p SET bed_id = b.id
        FROM rooms r
        JOIN LATERAL (
            SELECT id FROM beds bb WHERE bb.ward_id = r.ward_id AND bb.bed_no = r.room_number LIMIT 1
        ) b ON true
        WHERE p.room_id = r.id
    """)


def downgrade() -> None:
    op.drop_column("patients", "comorbidities")
    op.drop_column("patients", "bed_id")
    op.drop_index("ix_doctors_department_id", table_name="doctors")
    op.drop_column("doctors", "department_id")
    op.drop_index("ix_beds_ward_id", table_name="beds")
    op.drop_table("beds")
    op.drop_index("ix_wards_station_id", table_name="wards")
    op.drop_column("wards", "station_id")
    op.drop_column("wards", "ward_no")
    op.drop_index("ix_stations_department_id", table_name="stations")
    op.drop_table("stations")
    op.drop_column("organizations", "longitude")
    op.drop_column("organizations", "latitude")
