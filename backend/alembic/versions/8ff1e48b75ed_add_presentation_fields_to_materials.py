"""add_presentation_fields_to_materials

Revision ID: 8ff1e48b75ed
Revises: 971a0879e09f
Create Date: 2025-12-12 19:14:29.500771

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8ff1e48b75ed'
down_revision: Union[str, None] = '971a0879e09f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add presentation_status column
    op.add_column('materials', sa.Column('presentation_status', sa.String(length=50), nullable=True))

    # Add presentation_url column
    op.add_column('materials', sa.Column('presentation_url', sa.String(length=500), nullable=True))

    # Add presentation_embed_url column
    op.add_column('materials', sa.Column('presentation_embed_url', sa.String(length=500), nullable=True))


def downgrade() -> None:
    # Remove presentation columns
    op.drop_column('materials', 'presentation_embed_url')
    op.drop_column('materials', 'presentation_url')
    op.drop_column('materials', 'presentation_status')
