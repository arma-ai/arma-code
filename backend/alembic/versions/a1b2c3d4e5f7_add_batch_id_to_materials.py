"""add batch_id to materials

Revision ID: a1b2c3d4e5f7
Revises: 003a121bfe74
Create Date: 2026-03-04 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f7'
down_revision: Union[str, None] = '003a121bfe74'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add batch_id column to materials table
    op.add_column(
        'materials',
        sa.Column('batch_id', sa.UUID(), nullable=True)
    )
    
    # Create index for faster batch lookups
    op.create_index(
        'idx_materials_batch_id',
        'materials',
        ['batch_id'],
        unique=False
    )


def downgrade() -> None:
    # Drop index first
    op.drop_index('idx_materials_batch_id', table_name='materials')
    
    # Then drop column
    op.drop_column('materials', 'batch_id')
