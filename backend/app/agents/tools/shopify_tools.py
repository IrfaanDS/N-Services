"""
Shopify Agent Tools
───────────────────
Tools for the Shopify domain agent (admin-side, NOT the store chatbot).
"""
import json
import logging
from langchain_core.tools import tool

from app.api.deps import get_supabase

logger = logging.getLogger(__name__)


def _get_pg_engine():
    """Get or create the Postgres engine for Shopify queries."""
    from app.services.shopify.config import POSTGRES_URL
    if not POSTGRES_URL:
        return None
    from sqlalchemy import create_engine
    return create_engine(POSTGRES_URL)


@tool
def query_store_leads(
    tier: str = "",
    niche: str = "",
    country: str = "",
    sort_by: str = "lead_score",
    limit: int = 20,
) -> str:
    """Search the Shopify lead dashboard for store leads.
    Returns stores with lead scores, tiers, niches, and assistant deployment status.
    Use this when the user asks about Shopify stores or wants to find prospects.

    Args:
        tier: Filter by tier ("hot", "warm", "cold"). Empty string returns all.
        niche: Filter by store niche (e.g., "Fashion", "Electronics"). Empty string returns all.
        country: Filter by country. Empty string returns all.
        sort_by: Sort field ("lead_score", "created_at", "niche").
        limit: Maximum results (default 20).
    """
    try:
        engine = _get_pg_engine()
        if not engine:
            return json.dumps({"error": "Database not configured", "leads": []})

        from sqlalchemy import text

        conditions = []
        params = {"limit": min(limit, 50), "offset": 0}

        if tier and tier.strip():
            conditions.append("LOWER(tier) = :tier")
            params["tier"] = tier.strip().lower()
        if niche and niche.strip():
            conditions.append("niche ILIKE :niche")
            params["niche"] = f"%{niche.strip()}%"
        if country and country.strip():
            conditions.append("country = :country")
            params["country"] = country.strip()

        where = " AND ".join(conditions) if conditions else "1=1"

        sort_map = {
            "lead_score": "lead_score DESC NULLS LAST",
            "created_at": "created_at DESC NULLS LAST",
            "niche": "niche ASC NULLS LAST",
        }
        order = sort_map.get(sort_by, "lead_score DESC NULLS LAST")

        sql = f"""
            SELECT business_id, name, website_url, niche, country, lead_score,
                   tier, assistant_created, has_ai_assistant, email, created_at
            FROM shopify.lead_dashboard
            WHERE {where}
            ORDER BY {order}
            LIMIT :limit OFFSET :offset
        """

        with engine.connect() as conn:
            rows = conn.execute(text(sql), params).mappings().all()
            leads = [dict(row) for row in rows]

        return json.dumps({"leads": leads, "total": len(leads)}, default=str)
    except Exception as e:
        logger.error(f"query_store_leads error: {e}")
        return json.dumps({"error": str(e), "leads": []})


@tool
def get_store_detail(business_id: str) -> str:
    """Get complete details for a specific Shopify store lead.
    Returns domain, niche, score, tier, assistant status, contact info, and more.
    Use this when the user wants detailed info about a specific store.

    Args:
        business_id: The UUID of the business/store.
    """
    try:
        engine = _get_pg_engine()
        if not engine:
            return json.dumps({"error": "Database not configured"})

        from sqlalchemy import text

        sql = "SELECT * FROM shopify.lead_dashboard WHERE business_id = :bid"
        with engine.connect() as conn:
            row = conn.execute(text(sql), {"bid": business_id}).mappings().first()

        if not row:
            return json.dumps({"error": "Store not found"})

        return json.dumps(dict(row), default=str)
    except Exception as e:
        logger.error(f"get_store_detail error: {e}")
        return json.dumps({"error": str(e)})


@tool
def provision_assistant(business_id: str) -> str:
    """Deploy an AI shopping assistant for a Shopify store.
    Scrapes their product catalog and creates a conversational chatbot.
    Use this when the user wants to deploy/provision an assistant for a store.

    Args:
        business_id: The UUID of the business to provision.
    """
    try:
        import asyncio
        from app.services.shopify.onboarding_service import onboard_new_store

        engine = _get_pg_engine()
        if not engine:
            return json.dumps({"error": "Database not configured"})

        from sqlalchemy import text

        # Get store domain
        with engine.connect() as conn:
            lead = conn.execute(
                text("SELECT website_url, name FROM common.businesses WHERE id = :bid"),
                {"bid": business_id}
            ).mappings().first()

        if not lead:
            return json.dumps({"error": "Business not found"})

        domain = lead["website_url"]
        brand_name = lead["name"]

        # Run onboarding
        loop = asyncio.new_event_loop()
        try:
            result, error = loop.run_until_complete(onboard_new_store(domain, brand_name))
        finally:
            loop.close()

        if error and error != "STORE_ALREADY_EXISTS":
            return json.dumps({"error": f"Provisioning failed: {error}"})

        store_id = result.get("store_id")

        # Update Postgres
        with engine.begin() as conn:
            conn.execute(
                text("""
                    UPDATE shopify.stores
                    SET assistant_created = TRUE,
                        assistant_created_at = now(),
                        mongo_store_id = :mongo_id
                    WHERE business_id = :bid
                """),
                {"mongo_id": store_id, "bid": business_id}
            )

        return json.dumps({
            "status": "success",
            "store_id": store_id,
            "message": f"AI assistant deployed for {brand_name}",
        })
    except Exception as e:
        logger.error(f"provision_assistant error: {e}")
        return json.dumps({"error": str(e)})


@tool
def generate_store_outreach(
    store_name: str,
    niche: str,
    website_url: str,
    has_ai_assistant: bool = False,
    lead_score: int = 0,
) -> str:
    """Generate a personalized pitch email for a Shopify store owner.
    Highlights the value of an AI shopping assistant for their specific niche.
    Use this when the user wants to draft outreach for a Shopify store.

    Args:
        store_name: The store's brand name.
        niche: The store's product category/niche.
        website_url: The store's website URL.
        has_ai_assistant: Whether they already have an AI chatbot.
        lead_score: Their lead score (0-100).
    """
    try:
        from groq import Groq
        from app.core.config import get_settings

        settings = get_settings()
        client = Groq(api_key=settings.GROQ_API_KEY)

        prompt = f"""Write a personalized outreach email for a Shopify store owner.

Store: {store_name}
Website: {website_url}
Niche: {niche}
Has AI Assistant: {"Yes" if has_ai_assistant else "No"}
Lead Score: {lead_score}/100

Task: Write a consultative pitch email offering our AI Shopping Assistant service.
- If they DON'T have an AI assistant, position it as a competitive advantage they're missing.
- If they DO have one, position ours as a superior, more integrated solution.
- Reference their specific niche naturally.
- Keep under 150 words, consultative tone.
- Return ONLY JSON with "subject" and "body" fields.
"""
        completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.1-8b-instant",
            response_format={"type": "json_object"},
        )

        return completion.choices[0].message.content
    except Exception as e:
        logger.error(f"generate_store_outreach error: {e}")
        return json.dumps({"error": str(e)})


@tool
def send_outreach_email(
    recipient_email: str,
    subject: str,
    body: str,
) -> str:
    """Send a pitch email to a Shopify store owner via SMTP.
    Use this after the user has approved an outreach email draft.

    Args:
        recipient_email: The store owner's email address.
        subject: The email subject line.
        body: The email body text.
    """
    try:
        from email.message import EmailMessage
        from app.api.routes.sending import send_smtp

        supabase = get_supabase()
        res = supabase.schema("outreach").table("b2b_sending_accounts").select("*").limit(1).execute()
        if not res.data:
            return json.dumps({"error": "No sending accounts configured"})

        account = res.data[0]

        msg = EmailMessage()
        msg.set_content(body)
        msg["Subject"] = subject
        msg["From"] = f"{account['name']} <{account['smtp_user']}>"
        msg["To"] = recipient_email

        send_smtp(msg, account)
        return json.dumps({"status": "success", "message": f"Email sent to {recipient_email}"})
    except Exception as e:
        logger.error(f"send_outreach_email error: {e}")
        return json.dumps({"error": str(e)})


@tool
def get_dashboard_stats() -> str:
    """Fetch live Shopify module dashboard KPIs.
    Returns total stores, assistants deployed, hot leads, tier distribution,
    adoption rate, and outreach stats.
    Use this when the user asks about Shopify performance or wants an overview.
    """
    try:
        import asyncio
        from app.api.routes.dashboard import get_shopify_dashboard

        loop = asyncio.new_event_loop()
        try:
            result = loop.run_until_complete(get_shopify_dashboard())
        finally:
            loop.close()

        return json.dumps(result, default=str)
    except Exception as e:
        logger.error(f"get_dashboard_stats error: {e}")
        return json.dumps({"error": str(e)})
