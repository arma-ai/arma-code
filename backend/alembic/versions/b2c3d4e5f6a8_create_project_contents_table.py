"""create project_contents table

Revision ID: b2c3d4e5f6a8
Revises: a1b2c3d4e5f7
Create Date: 2026-03-04 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a8'
down_revision: Union[str, None] = 'a1b2c3d4e5f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create project_contents table (use existing processingstatus enum via String)
    op.create_table(
        'project_contents',
        sa.Column('id', sa.UUID(), primary_key=True, default=sa.text('gen_random_uuid()')),
        sa.Column('project_id', sa.UUID(), nullable=False, index=True, unique=True),
        sa.Column('summary', sa.Text(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('flashcards', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('quiz', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('processing_status', sa.String(50), nullable=False, index=True),
        sa.Column('processing_progress', sa.Integer(), default=0, nullable=False),
        sa.Column('processing_error', sa.Text(), nullable=True),
        sa.Column('total_materials', sa.Integer(), default=0, nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.Index('idx_project_contents_project_status', 'project_id', 'processing_status'),
        sa.CheckConstraint("processing_status IN ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED')", name='check_processing_status'),
    )


def downgrade() -> None:
    # Drop table
    op.drop_table('project_contents')
