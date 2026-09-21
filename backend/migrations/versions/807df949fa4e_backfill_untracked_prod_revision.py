"""Backfill stub for untracked revision already applied on the hosted DB

The hosted database's alembic_version was found stamped as 807df949fa4e,
a revision with no corresponding file in this repo (likely created and
applied locally by someone, never committed). Schema inspection showed
the DB otherwise matches this chain through e5f6a7b8c9d0 exactly, so this
stub is inserted as a no-op checkpoint at that point in the chain purely
to make the local revision graph resolvable again. It does not attempt to
reproduce whatever the original untracked migration did, since the DB
already reflects its effect.

Revision ID: 807df949fa4e
Revises: e5f6a7b8c9d0
Create Date: 2026-09-21 00:00:00.000000

"""
from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = '807df949fa4e'
down_revision: Union[str, None] = 'e5f6a7b8c9d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
