"""Create project_tutor_messages table

Revision ID: 20260309_project_tutor
Revises: b2c3d4e5f6a8
Create Date: 2026-03-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '20260309_project_tutor'
down_revision: Union[str, None] = 'b2c3d4e5f6a8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create project_tutor_messages table for project-level chat
    op.create_table('project_tutor_messages',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('project_id', sa.UUID(), nullable=False),
    sa.Column('role', sa.String(length=20), nullable=False),
    sa.Column('content', sa.Text(), nullable=False),
    sa.Column('context', sa.String(length=50), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for efficient queries
    op.create_index('idx_project_tutor_messages_project_id', 'project_tutor_messages', ['project_id'], unique=False)
    op.create_index('idx_project_tutor_messages_created_at', 'project_tutor_messages', ['created_at'], unique=False)
    op.create_index('idx_project_tutor_messages_project_created', 'project_tutor_messages', ['project_id', 'created_at'], unique=False)


def downgrade() -> None:
    op.drop_index('idx_project_tutor_messages_project_created', table_name='project_tutor_messages')
    op.drop_index('idx_project_tutor_messages_created_at', table_name='project_tutor_messages')
    op.drop_index('idx_project_tutor_messages_project_id', table_name='project_tutor_messages')
    op.drop_table('project_tutor_messages')
