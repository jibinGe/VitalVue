"""Add nurse_type to nurse table

Revision ID: 4297a0addd08
Revises: 4e842084eab1
Create Date: 2026-09-21 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4297a0addd08'
down_revision: Union[str, None] = '4e842084eab1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('nurses', sa.Column('nurse_type', sa.String(20), nullable=True))


def downgrade() -> None:
    op.drop_column('nurses', 'nurse_type')
