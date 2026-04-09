"""add pending_email and last_verified_at fields

Revision ID: add_pending_email_last_verified
Revises: add_email_verification
Create Date: 2026-04-08
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_pending_email_last_verified'
down_revision = 'add_email_verification'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('pending_email', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('last_verified_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'last_verified_at')
    op.drop_column('users', 'pending_email')
