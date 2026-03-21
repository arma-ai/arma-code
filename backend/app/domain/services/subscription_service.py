"""Subscription management service."""

import logging
from datetime import datetime
from uuid import UUID

import stripe
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.infrastructure.database.models.subscription import (
    PlanTier,
    StripeEvent,
    Subscription,
    SubscriptionStatus,
)

logger = logging.getLogger(__name__)

stripe.api_key = settings.STRIPE_SECRET_KEY

PLAN_PRICE_MAP = {
    PlanTier.STUDENT: settings.STRIPE_STUDENT_PRICE_ID,
    PlanTier.PRO: settings.STRIPE_PRO_PRICE_ID,
}


async def get_or_create_subscription(user_id: UUID, db: AsyncSession) -> Subscription:
    """Get existing subscription or create a free one."""
    result = await db.execute(
        select(Subscription).where(Subscription.user_id == user_id)
    )
    sub = result.scalar_one_or_none()
    if sub:
        return sub

    sub = Subscription(
        user_id=user_id,
        plan_tier=PlanTier.FREE,
        status=SubscriptionStatus.ACTIVE,
    )
    db.add(sub)
    await db.commit()
    await db.refresh(sub)
    return sub


async def create_checkout_session(
    user_id: UUID,
    plan_tier: str,
    success_url: str,
    cancel_url: str,
    db: AsyncSession,
) -> str:
    """Create a Stripe Checkout Session and return the URL."""
    tier = PlanTier(plan_tier)
    if tier == PlanTier.FREE:
        raise ValueError("Cannot checkout for the free plan")

    price_id = PLAN_PRICE_MAP.get(tier)
    if not price_id:
        raise ValueError(f"No Stripe price configured for {tier}")

    sub = await get_or_create_subscription(user_id, db)

    # Ensure Stripe customer exists
    if not sub.stripe_customer_id:
        from app.infrastructure.database.models.user import User

        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one()
        customer = stripe.Customer.create(
            email=user.email,
            metadata={"user_id": str(user_id)},
        )
        sub.stripe_customer_id = customer.id
        await db.commit()

    session = stripe.checkout.Session.create(
        customer=sub.stripe_customer_id,
        mode="subscription",
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"user_id": str(user_id)},
    )
    return session.url


async def create_portal_session(user_id: UUID, return_url: str, db: AsyncSession) -> str:
    """Create a Stripe Customer Portal session and return the URL."""
    sub = await get_or_create_subscription(user_id, db)
    if not sub.stripe_customer_id:
        raise ValueError("No Stripe customer found. Subscribe first.")

    session = stripe.billing_portal.Session.create(
        customer=sub.stripe_customer_id,
        return_url=return_url,
    )
    return session.url


async def handle_webhook_event(event: dict, db: AsyncSession) -> None:
    """Process a Stripe webhook event with idempotency."""
    event_id = event["id"]
    event_type = event["type"]

    # Idempotency check
    existing = await db.execute(
        select(StripeEvent).where(StripeEvent.stripe_event_id == event_id)
    )
    if existing.scalar_one_or_none():
        logger.info("Stripe event %s already processed, skipping", event_id)
        return

    # Record the event
    db.add(StripeEvent(
        stripe_event_id=event_id,
        event_type=event_type,
        payload=event,
    ))

    data_obj = event["data"]["object"]

    if event_type == "checkout.session.completed":
        await _handle_checkout_completed(data_obj, db)
    elif event_type == "customer.subscription.updated":
        await _sync_subscription_from_stripe(data_obj, db)
    elif event_type == "customer.subscription.deleted":
        await _handle_subscription_deleted(data_obj, db)
    elif event_type == "invoice.payment_failed":
        await _handle_payment_failed(data_obj, db)
    elif event_type == "invoice.paid":
        await _handle_invoice_paid(data_obj, db)

    await db.commit()


async def _handle_checkout_completed(session_obj: dict, db: AsyncSession) -> None:
    """Activate subscription after successful checkout."""
    stripe_sub_id = session_obj.get("subscription")
    if not stripe_sub_id:
        return

    stripe_sub = stripe.Subscription.retrieve(stripe_sub_id)
    await _sync_subscription_from_stripe(stripe_sub, db)


async def _sync_subscription_from_stripe(stripe_sub: dict, db: AsyncSession) -> None:
    """Sync local subscription record from Stripe subscription data."""
    customer_id = stripe_sub.get("customer")
    if not customer_id:
        return

    result = await db.execute(
        select(Subscription)
        .where(Subscription.stripe_customer_id == customer_id)
        .with_for_update()
    )
    sub = result.scalar_one_or_none()
    if not sub:
        logger.warning("No subscription found for customer %s", customer_id)
        return

    sub.stripe_subscription_id = stripe_sub.get("id")

    # Determine plan tier from price
    items = stripe_sub.get("items", {}).get("data", [])
    if items:
        price_id = items[0].get("price", {}).get("id", "")
        if price_id == settings.STRIPE_PRO_PRICE_ID:
            sub.plan_tier = PlanTier.PRO
        elif price_id == settings.STRIPE_STUDENT_PRICE_ID:
            sub.plan_tier = PlanTier.STUDENT
        else:
            sub.plan_tier = PlanTier.FREE

    # Status mapping
    stripe_status = stripe_sub.get("status", "active")
    status_map = {
        "active": SubscriptionStatus.ACTIVE,
        "past_due": SubscriptionStatus.PAST_DUE,
        "canceled": SubscriptionStatus.CANCELED,
        "trialing": SubscriptionStatus.TRIALING,
    }
    sub.status = status_map.get(stripe_status, SubscriptionStatus.ACTIVE)

    # Period
    period_start = stripe_sub.get("current_period_start")
    period_end = stripe_sub.get("current_period_end")
    if period_start:
        sub.current_period_start = datetime.utcfromtimestamp(period_start)
    if period_end:
        sub.current_period_end = datetime.utcfromtimestamp(period_end)

    sub.cancel_at_period_end = stripe_sub.get("cancel_at_period_end", False)
    sub.updated_at = datetime.utcnow()


async def _handle_subscription_deleted(stripe_sub: dict, db: AsyncSession) -> None:
    """Downgrade to free when subscription is deleted."""
    customer_id = stripe_sub.get("customer")
    if not customer_id:
        return

    result = await db.execute(
        select(Subscription)
        .where(Subscription.stripe_customer_id == customer_id)
        .with_for_update()
    )
    sub = result.scalar_one_or_none()
    if sub:
        sub.plan_tier = PlanTier.FREE
        sub.status = SubscriptionStatus.CANCELED
        sub.stripe_subscription_id = None
        sub.current_period_start = None
        sub.current_period_end = None
        sub.cancel_at_period_end = False
        sub.updated_at = datetime.utcnow()


async def _handle_payment_failed(invoice: dict, db: AsyncSession) -> None:
    """Mark subscription as past_due on payment failure."""
    customer_id = invoice.get("customer")
    if not customer_id:
        return

    result = await db.execute(
        select(Subscription)
        .where(Subscription.stripe_customer_id == customer_id)
        .with_for_update()
    )
    sub = result.scalar_one_or_none()
    if sub:
        sub.status = SubscriptionStatus.PAST_DUE
        sub.updated_at = datetime.utcnow()


async def _handle_invoice_paid(invoice: dict, db: AsyncSession) -> None:
    """Confirm active status on successful payment."""
    customer_id = invoice.get("customer")
    if not customer_id:
        return

    result = await db.execute(
        select(Subscription)
        .where(Subscription.stripe_customer_id == customer_id)
        .with_for_update()
    )
    sub = result.scalar_one_or_none()
    if sub and sub.status == SubscriptionStatus.PAST_DUE:
        sub.status = SubscriptionStatus.ACTIVE
        sub.updated_at = datetime.utcnow()
