"""Add doctor_type to doctor table

Revision ID: 4e842084eab1
Revises: e5f6a7b8c9d0
Create Date: 2026-09-21 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4e842084eab1'
down_revision: Union[str, None] = '807df949fa4e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('doctors', sa.Column('doctor_type', sa.String(20), nullable=True))


def downgrade() -> None:
    op.drop_column('doctors', 'doctor_type')
