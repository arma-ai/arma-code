"""Subscription and billing schemas."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class SubscriptionResponse(BaseModel):
    plan_tier: str
    status: str
    current_period_end: Optional[datetime] = None
    cancel_at_period_end: bool = False

    model_config = ConfigDict(from_attributes=True)


class UsageSummary(BaseModel):
    resource_type: str
    used: int
    limit: int  # -1 = unlimited


class BillingInfoResponse(BaseModel):
    subscription: SubscriptionResponse
    usage: List[UsageSummary]


class CreateCheckoutRequest(BaseModel):
    plan_tier: str
    success_url: str
    cancel_url: str


class CheckoutResponse(BaseModel):
    checkout_url: str


class PortalRequest(BaseModel):
    return_url: str


class PortalResponse(BaseModel):
    portal_url: str
