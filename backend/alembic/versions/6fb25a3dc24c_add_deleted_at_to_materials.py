"""add_deleted_at_to_materials

Revision ID: 6fb25a3dc24c
Revises: change_correct_option_text
Create Date: 2026-02-21 04:29:00.706626

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6fb25a3dc24c'
down_revision: Union[str, None] = 'change_correct_option_text'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add deleted_at column for soft delete functionality
    op.add_column('materials', sa.Column('deleted_at', sa.DateTime(), nullable=True))
    
    # Create index on deleted_at for efficient soft delete queries
    op.create_index('idx_materials_deleted', 'materials', ['deleted_at'], unique=False)


def downgrade() -> None:
    # Drop index first
    op.drop_index('idx_materials_deleted', table_name='materials')
    
    # Remove column
    op.drop_column('materials', 'deleted_at')
