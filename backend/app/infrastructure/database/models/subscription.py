"""Subscription and billing models."""

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.infrastructure.database.base import Base


class PlanTier(str, enum.Enum):
    FREE = "free"
    STUDENT = "student"
    PRO = "pro"


class SubscriptionStatus(str, enum.Enum):
    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELED = "canceled"
    TRIALING = "trialing"


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    stripe_customer_id = Column(String(255), nullable=True)
    stripe_subscription_id = Column(String(255), nullable=True)

    plan_tier = Column(
        Enum(PlanTier, name="plan_tier_enum"),
        default=PlanTier.FREE,
        nullable=False,
    )
    status = Column(
        Enum(SubscriptionStatus, name="subscription_status_enum"),
        default=SubscriptionStatus.ACTIVE,
        nullable=False,
    )

    current_period_start = Column(DateTime, nullable=True)
    current_period_end = Column(DateTime, nullable=True)
    cancel_at_period_end = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, server_default=func.now())
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        server_default=func.now(),
        onupdate=datetime.utcnow,
    )

    # Relationships
    user = relationship("User", back_populates="subscription")

    def __repr__(self):
        return f"<Subscription user_id={self.user_id} plan={self.plan_tier}>"


class UsageRecord(Base):
    __tablename__ = "usage_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    resource_type = Column(String(50), nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    period_start = Column(Date, nullable=False)

    __table_args__ = (
        Index("ix_usage_user_resource_period", "user_id", "resource_type", "period_start"),
    )


class StripeEvent(Base):
    __tablename__ = "stripe_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    stripe_event_id = Column(String(255), unique=True, nullable=False, index=True)
    event_type = Column(String(100), nullable=False)
    processed_at = Column(DateTime, default=datetime.utcnow, server_default=func.now())
    payload = Column(JSONB, nullable=True)


class PlanLimit(Base):
    __tablename__ = "plan_limits"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    plan_tier = Column(
        Enum(PlanTier, name="plan_tier_enum", create_type=False),
        nullable=False,
    )
    resource_type = Column(String(50), nullable=False)
    monthly_limit = Column(Integer, nullable=False)  # -1 = unlimited

    __table_args__ = (
        Index("ix_plan_limit_tier_resource", "plan_tier", "resource_type", unique=True),
    )
