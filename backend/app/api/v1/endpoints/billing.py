"""Billing API endpoints."""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_active_user, get_db
from app.domain.services.subscription_service import (
    create_checkout_session,
    create_portal_session,
    get_or_create_subscription,
)
from app.domain.services.usage_tracking_service import get_usage_summary
from app.infrastructure.database.models.user import User
from app.schemas.subscription import (
    BillingInfoResponse,
    CheckoutResponse,
    CreateCheckoutRequest,
    PortalRequest,
    PortalResponse,
    SubscriptionResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout(
    body: CreateCheckoutRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a Stripe Checkout Session for upgrading."""
    try:
        url = await create_checkout_session(
            user_id=current_user.id,
            plan_tier=body.plan_tier,
            success_url=body.success_url,
            cancel_url=body.cancel_url,
            db=db,
        )
        return CheckoutResponse(checkout_url=url)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.exception("Failed to create checkout session")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create checkout session",
        )


@router.post("/portal", response_model=PortalResponse)
async def create_portal(
    body: PortalRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Create a Stripe Customer Portal session."""
    try:
        url = await create_portal_session(current_user.id, body.return_url, db)
        return PortalResponse(portal_url=url)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.exception("Failed to create portal session")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create portal session",
        )


@router.get("/subscription", response_model=BillingInfoResponse)
async def get_subscription(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get current subscription and usage info."""
    sub = await get_or_create_subscription(current_user.id, db)
    usage = await get_usage_summary(current_user.id, db)

    return BillingInfoResponse(
        subscription=SubscriptionResponse(
            plan_tier=sub.plan_tier.value if hasattr(sub.plan_tier, 'value') else sub.plan_tier,
            status=sub.status.value if hasattr(sub.status, 'value') else sub.status,
            current_period_end=sub.current_period_end,
            cancel_at_period_end=sub.cancel_at_period_end,
        ),
        usage=usage,
    )


@router.get("/usage")
async def get_usage(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Get detailed usage for current billing period."""
    usage = await get_usage_summary(current_user.id, db)
    return {"usage": [u.model_dump() for u in usage]}
