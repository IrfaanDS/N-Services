import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from pydantic import BaseModel
from app.core.config import get_settings
from app.api.deps import get_supabase
import logging

router = APIRouter(prefix="/stripe", tags=["stripe"])
logger = logging.getLogger(__name__)

class CreateCheckoutSessionRequest(BaseModel):
    user_id: str
    email: str
    tier: str

@router.post("/create-checkout-session")
async def create_checkout_session(req: CreateCheckoutSessionRequest):
    settings = get_settings()
    stripe.api_key = settings.STRIPE_SECRET_KEY
    
    # Map tier to Price ID
    price_id = None
    tier_lower = req.tier.lower()
    if tier_lower == "basic":
        price_id = settings.STRIPE_PRICE_BASIC
    elif tier_lower == "pro":
        price_id = settings.STRIPE_PRICE_PRO
    elif tier_lower == "premium" or tier_lower == "enterprise":
        price_id = settings.STRIPE_PRICE_PREMIUM
    else:
        raise HTTPException(status_code=400, detail="Invalid tier selected.")

    if not price_id:
        raise HTTPException(status_code=500, detail=f"Stripe Price ID for tier '{tier_lower}' is not configured.")

    try:
        # Create a checkout session
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            customer_email=req.email,
            client_reference_id=req.user_id,
            line_items=[
                {
                    'price': price_id,
                    'quantity': 1,
                },
            ],
            mode='subscription',
            success_url=f"{settings.FRONTEND_URL}/dashboard?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{settings.FRONTEND_URL}/signup",
            metadata={
                "user_id": req.user_id,
                "tier": tier_lower
            }
        )
        return {"url": checkout_session.url}
    except Exception as e:
        logger.error(f"Error creating checkout session: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/webhook")
async def stripe_webhook(request: Request, background_tasks: BackgroundTasks):
    settings = get_settings()
    stripe.api_key = settings.STRIPE_SECRET_KEY
    webhook_secret = settings.STRIPE_WEBHOOK_SECRET

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
    except ValueError as e:
        # Invalid payload
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Handle the event
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        background_tasks.add_task(handle_checkout_session_completed, session)
    elif event['type'] == 'customer.subscription.updated':
        subscription = event['data']['object']
        background_tasks.add_task(handle_subscription_updated, subscription)
    elif event['type'] == 'customer.subscription.deleted':
        subscription = event['data']['object']
        background_tasks.add_task(handle_subscription_deleted, subscription)

    return {"status": "success"}


async def handle_checkout_session_completed(session):
    user_id = session.get("client_reference_id")
    customer_id = session.get("customer")
    subscription_id = session.get("subscription")
    metadata = session.get("metadata", {})
    tier = metadata.get("tier", "basic")

    if not user_id:
        logger.error("No user_id found in checkout session client_reference_id")
        return

    supabase = get_supabase()
    
    try:
        # Upsert user_subscriptions
        supabase.table("user_subscriptions").upsert({
            "user_id": user_id,
            "stripe_customer_id": customer_id,
            "stripe_subscription_id": subscription_id,
            "tier": tier,
            "status": "active"
        }).execute()
        logger.info(f"Successfully activated subscription for user {user_id}")
    except Exception as e:
        logger.error(f"Failed to update subscription in Supabase: {e}")

async def handle_subscription_updated(subscription):
    customer_id = subscription.get("customer")
    subscription_id = subscription.get("id")
    status = subscription.get("status")

    supabase = get_supabase()
    try:
        supabase.table("user_subscriptions").update({
            "status": status
        }).eq("stripe_subscription_id", subscription_id).execute()
        logger.info(f"Updated subscription {subscription_id} status to {status}")
    except Exception as e:
        logger.error(f"Failed to update subscription status: {e}")

async def handle_subscription_deleted(subscription):
    subscription_id = subscription.get("id")

    supabase = get_supabase()
    try:
        supabase.table("user_subscriptions").update({
            "status": "canceled"
        }).eq("stripe_subscription_id", subscription_id).execute()
        logger.info(f"Canceled subscription {subscription_id}")
    except Exception as e:
        logger.error(f"Failed to cancel subscription: {e}")
