"""merge billing and material enum heads

Revision ID: 20260321_merge_heads
Revises: 20260316_mat_enum, 20260319_subscription
Create Date: 2026-03-21
"""

from typing import Sequence, Union


revision: str = "20260321_merge_heads"
down_revision: Union[str, Sequence[str], None] = (
    "20260316_mat_enum",
    "20260319_subscription",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
