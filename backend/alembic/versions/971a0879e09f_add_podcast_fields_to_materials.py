"""add_podcast_fields_to_materials

Revision ID: 971a0879e09f
Revises: dab3998dcff8
Create Date: 2025-12-12 18:54:18.191467

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '971a0879e09f'
down_revision: Union[str, None] = 'dab3998dcff8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add podcast_script column (JSONB)
    op.add_column('materials', sa.Column('podcast_script', postgresql.JSONB(astext_type=sa.Text()), nullable=True))

    # Add podcast_audio_url column (String)
    op.add_column('materials', sa.Column('podcast_audio_url', sa.String(length=500), nullable=True))


def downgrade() -> None:
    # Remove podcast columns
    op.drop_column('materials', 'podcast_audio_url')
    op.drop_column('materials', 'podcast_script')
