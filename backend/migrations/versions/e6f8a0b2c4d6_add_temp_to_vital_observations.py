"""Add skin temperature to vital_observations

Revision ID: e6f8a0b2c4d6
Revises: d4e6f8a0b2c4
Create Date: 2026-09-25 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e6f8a0b2c4d6'
down_revision: Union[str, None] = 'd4e6f8a0b2c4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('vital_observations', sa.Column('temp', sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column('vital_observations', 'temp')
