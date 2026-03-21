"""Add subscription and billing tables

Revision ID: 20260319_subscription
Revises: 20260309_project_tutor
Create Date: 2026-03-19

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '20260319_subscription'
down_revision: Union[str, None] = '20260309_project_tutor'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enums
    plan_tier_enum = postgresql.ENUM('free', 'student', 'pro', name='plan_tier_enum', create_type=False)
    subscription_status_enum = postgresql.ENUM(
        'active',
        'past_due',
        'canceled',
        'trialing',
        name='subscription_status_enum',
        create_type=False,
    )

    plan_tier_enum.create(op.get_bind(), checkfirst=True)
    subscription_status_enum.create(op.get_bind(), checkfirst=True)

    # Subscriptions table
    op.create_table(
        'subscriptions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False),
        sa.Column('stripe_customer_id', sa.String(255), nullable=True),
        sa.Column('stripe_subscription_id', sa.String(255), nullable=True),
        sa.Column('plan_tier', plan_tier_enum, server_default='free', nullable=False),
        sa.Column('status', subscription_status_enum, server_default='active', nullable=False),
        sa.Column('current_period_start', sa.DateTime, nullable=True),
        sa.Column('current_period_end', sa.DateTime, nullable=True),
        sa.Column('cancel_at_period_end', sa.Boolean, server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index('ix_subscriptions_user_id', 'subscriptions', ['user_id'])

    # Usage records table
    op.create_table(
        'usage_records',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('resource_type', sa.String(50), nullable=False),
        sa.Column('quantity', sa.Integer, default=1, nullable=False),
        sa.Column('period_start', sa.Date, nullable=False),
    )
    op.create_index('ix_usage_user_resource_period', 'usage_records', ['user_id', 'resource_type', 'period_start'])

    # Stripe events table (idempotency)
    op.create_table(
        'stripe_events',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('stripe_event_id', sa.String(255), unique=True, nullable=False),
        sa.Column('event_type', sa.String(100), nullable=False),
        sa.Column('processed_at', sa.DateTime, server_default=sa.func.now()),
        sa.Column('payload', postgresql.JSONB, nullable=True),
    )
    op.create_index('ix_stripe_events_stripe_event_id', 'stripe_events', ['stripe_event_id'])

    # Plan limits table (config)
    op.create_table(
        'plan_limits',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('plan_tier', plan_tier_enum, nullable=False),
        sa.Column('resource_type', sa.String(50), nullable=False),
        sa.Column('monthly_limit', sa.Integer, nullable=False),
    )
    op.create_index('ix_plan_limit_tier_resource', 'plan_limits', ['plan_tier', 'resource_type'], unique=True)

    # Seed plan limits data
    # -1 = unlimited
    op.execute("""
        INSERT INTO plan_limits (id, plan_tier, resource_type, monthly_limit) VALUES
        -- Free plan
        (gen_random_uuid(), 'free', 'material_upload', 3),
        (gen_random_uuid(), 'free', 'chat_message', 50),
        (gen_random_uuid(), 'free', 'podcast_generation', 0),
        (gen_random_uuid(), 'free', 'presentation_generation', 0),
        (gen_random_uuid(), 'free', 'storage_mb', 100),
        -- Student plan
        (gen_random_uuid(), 'student', 'material_upload', 30),
        (gen_random_uuid(), 'student', 'chat_message', 500),
        (gen_random_uuid(), 'student', 'podcast_generation', 10),
        (gen_random_uuid(), 'student', 'presentation_generation', 10),
        (gen_random_uuid(), 'student', 'storage_mb', 1024),
        -- Pro plan
        (gen_random_uuid(), 'pro', 'material_upload', -1),
        (gen_random_uuid(), 'pro', 'chat_message', -1),
        (gen_random_uuid(), 'pro', 'podcast_generation', -1),
        (gen_random_uuid(), 'pro', 'presentation_generation', -1),
        (gen_random_uuid(), 'pro', 'storage_mb', 10240)
    """)


def downgrade() -> None:
    op.drop_table('plan_limits')
    op.drop_table('stripe_events')
    op.drop_table('usage_records')
    op.drop_table('subscriptions')

    sa.Enum(name='subscription_status_enum').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='plan_tier_enum').drop(op.get_bind(), checkfirst=True)
