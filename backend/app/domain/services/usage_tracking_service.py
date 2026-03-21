"""Usage tracking and quota enforcement service."""

import logging
from datetime import date
from typing import List, Tuple
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database.models.subscription import (
    PlanLimit,
    PlanTier,
    Subscription,
    SubscriptionStatus,
    UsageRecord,
)
from app.schemas.subscription import UsageSummary

logger = logging.getLogger(__name__)


def _current_period_start() -> date:
    """Return the 1st of the current month."""
    today = date.today()
    return today.replace(day=1)


async def _get_plan_tier(user_id: UUID, db: AsyncSession) -> PlanTier:
    """Get the effective plan tier for a user."""
    result = await db.execute(
        select(Subscription).where(Subscription.user_id == user_id)
    )
    sub = result.scalar_one_or_none()
    if not sub:
        return PlanTier.FREE

    # past_due grace: treat as their plan still, handled by caller if needed
    if sub.status in (SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING, SubscriptionStatus.PAST_DUE):
        return sub.plan_tier

    return PlanTier.FREE


async def record_usage(
    user_id: UUID,
    resource_type: str,
    quantity: int,
    db: AsyncSession,
) -> None:
    """Record a usage event for the current billing period."""
    period = _current_period_start()
    record = UsageRecord(
        user_id=user_id,
        resource_type=resource_type,
        quantity=quantity,
        period_start=period,
    )
    db.add(record)
    await db.flush()


async def check_quota(
    user_id: UUID,
    resource_type: str,
    db: AsyncSession,
) -> Tuple[bool, UsageSummary]:
    """
    Check if the user can use the resource.

    Returns (allowed, usage_summary).
    """
    plan_tier = await _get_plan_tier(user_id, db)
    period = _current_period_start()

    # Get limit
    limit_result = await db.execute(
        select(PlanLimit).where(
            PlanLimit.plan_tier == plan_tier,
            PlanLimit.resource_type == resource_type,
        )
    )
    plan_limit = limit_result.scalar_one_or_none()
    monthly_limit = plan_limit.monthly_limit if plan_limit else 0

    # Get current usage
    usage_result = await db.execute(
        select(func.coalesce(func.sum(UsageRecord.quantity), 0)).where(
            UsageRecord.user_id == user_id,
            UsageRecord.resource_type == resource_type,
            UsageRecord.period_start == period,
        )
    )
    used = usage_result.scalar()

    summary = UsageSummary(
        resource_type=resource_type,
        used=used,
        limit=monthly_limit,
    )

    # -1 means unlimited
    if monthly_limit == -1:
        return True, summary

    return used < monthly_limit, summary


async def get_usage_summary(user_id: UUID, db: AsyncSession) -> List[UsageSummary]:
    """Get usage summary for all resource types for the current period."""
    plan_tier = await _get_plan_tier(user_id, db)
    period = _current_period_start()

    # Get all limits for this plan
    limits_result = await db.execute(
        select(PlanLimit).where(PlanLimit.plan_tier == plan_tier)
    )
    limits = {pl.resource_type: pl.monthly_limit for pl in limits_result.scalars().all()}

    # Get all usage for this period
    usage_result = await db.execute(
        select(
            UsageRecord.resource_type,
            func.coalesce(func.sum(UsageRecord.quantity), 0),
        )
        .where(
            UsageRecord.user_id == user_id,
            UsageRecord.period_start == period,
        )
        .group_by(UsageRecord.resource_type)
    )
    usage_map = {row[0]: row[1] for row in usage_result.all()}

    summaries = []
    for resource_type, monthly_limit in limits.items():
        summaries.append(UsageSummary(
            resource_type=resource_type,
            used=usage_map.get(resource_type, 0),
            limit=monthly_limit,
        ))

    return summaries
