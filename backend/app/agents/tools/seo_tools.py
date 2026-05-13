"""
SEO Agent Tools
───────────────
Tools for the SEO domain agent. Each wraps existing service functions.
Tool signatures are kept simple (string params, no Optional) for
maximum compatibility with Groq Llama tool-calling.
"""
import json
import logging
from langchain_core.tools import tool

from app.api.deps import get_supabase

logger = logging.getLogger(__name__)


@tool
def query_seo_leads(niche: str = "", city: str = "", country: str = "", search: str = "", page_size: int = 10) -> str:
    """Search and filter business leads from the SEO lead database.
    Returns paginated results with business name, website, niche, city, and contact info.
    Use this when the user asks about leads, wants to find businesses, or needs data from the CRM.
    Pass empty string "" for any filter you don't want to apply.

    Args:
        niche: Filter by business niche (e.g., "Plumber", "HVAC", "Dentist"). Empty string for no filter.
        city: Filter by city (e.g., "Phoenix", "Dallas"). Empty string for no filter.
        country: Filter by country. Empty string for no filter.
        search: Free-text search by business name or website. Empty string for no filter.
        page_size: Number of results to return (default 10, max 25).
    """
    try:
        supabase = get_supabase()

        columns = (
            "id, name, website_url, niche, city, country, "
            "contacts(email, phone, linkedin, instagram, facebook)"
        )
        query = supabase.schema("common").table("businesses").select(columns, count="exact")

        if niche and niche.strip():
            query = query.ilike("niche", f"%{niche.strip()}%")
        if city and city.strip():
            query = query.ilike("city", f"%{city.strip()}%")
        if country and country.strip():
            query = query.ilike("country", f"%{country.strip()}%")
        if search and search.strip():
            s = search.strip()
            query = query.or_(f"name.ilike.%{s}%,website_url.ilike.%{s}%")

        ps = min(max(page_size, 1), 25)
        result = query.range(0, ps - 1).execute()
        total = result.count or 0

        leads = []
        for row in (result.data or []):
            contacts_raw = row.pop("contacts", None)
            contact = {}
            if isinstance(contacts_raw, list) and contacts_raw:
                contact = contacts_raw[0]
            elif isinstance(contacts_raw, dict):
                contact = contacts_raw

            leads.append({
                "business_id": row.get("id"),
                "name": row.get("name"),
                "website": row.get("website_url"),
                "niche": row.get("niche"),
                "city": row.get("city"),
                "country": row.get("country"),
                "email": contact.get("email") if contact else None,
                "phone": contact.get("phone") if contact else None,
            })

        return json.dumps({"leads": leads, "total": total, "showing": len(leads)})
    except Exception as e:
        logger.error(f"query_seo_leads error: {e}")
        return json.dumps({"error": str(e), "leads": []})


@tool
def evaluate_leads(business_ids: list[str]) -> str:
    """Run the SEO audit scoring algorithm on specific business IDs.
    Returns lead_score (0-100), priority tier, and technical reasoning for each lead.
    Higher score means more SEO issues found, making them a better prospect for outreach.

    Args:
        business_ids: List of business UUID strings to evaluate.
    """
    try:
        from app.api.routes.evaluation import _fetch_and_score
        supabase = get_supabase()

        scored = _fetch_and_score(supabase, business_ids)

        if not scored:
            return json.dumps({"error": "No matching businesses found for the given IDs.", "results": []})

        scores = [s["lead_score"] for s in scored]
        avg = round(sum(scores) / len(scores), 1) if scores else 0

        return json.dumps({
            "results": scored[:10],  # Limit to prevent token overload
            "total": len(scored),
            "avg_score": avg,
            "high_priority": sum(1 for s in scored if s.get("priority") == "High"),
        })
    except Exception as e:
        logger.error(f"evaluate_leads error: {e}")
        return json.dumps({"error": str(e), "results": []})


@tool
def audit_website(url: str) -> str:
    """Crawl a URL and extract technical SEO metrics including title tag, meta description,
    H1 structure, image alt text audit, link profile, and schema markup presence.
    Use this when the user provides a URL or asks you to check a specific website.

    Args:
        url: The full URL to audit (e.g., "https://example.com").
    """
    try:
        from app.services.audit import perform_audit
        result = perform_audit(url)
        return json.dumps(result, default=str)
    except Exception as e:
        logger.error(f"audit_website error: {e}")
        return json.dumps({"error": str(e)})


@tool
def search_seo_knowledge(query: str) -> str:
    """Search the RAG knowledge base built from Google Search Central documentation.
    Returns relevant SEO best-practice guidance and recommendations.
    Use this to support your analysis with authoritative documentation.

    Args:
        query: The search query (e.g., "meta description best practices").
    """
    try:
        from app.services.rag import search_knowledge_base
        results = search_knowledge_base(query)
        return results if results else "No relevant knowledge base entries found."
    except Exception as e:
        logger.error(f"search_seo_knowledge error: {e}")
        return f"Knowledge base search error: {str(e)}"


@tool
def generate_outreach_email(website_url: str, niche: str, city: str, lead_score: int, reasoning: str) -> str:
    """Generate a personalized cold outreach email for a specific SEO lead.
    Uses the lead's audit data and business context to craft a consultative pitch.

    Args:
        website_url: The business website URL.
        niche: The business niche (e.g., "Plumber").
        city: The business location city.
        lead_score: The SEO priority score (0-100).
        reasoning: Technical issues found during audit (comma-separated).
    """
    try:
        from app.services.seo_emails import generate_seo_outreach_email
        result = generate_seo_outreach_email(
            website_url=website_url, niche=niche, city=city,
            lead_score=lead_score, reasoning=reasoning,
        )
        return json.dumps(result)
    except Exception as e:
        logger.error(f"generate_outreach_email error: {e}")
        return json.dumps({"error": str(e)})


@tool
def queue_emails_for_sending(emails: list[dict]) -> str:
    """Save draft emails to the outreach mailbox for review and sending.
    Each email in the list should have keys: business_id, email, subject, body.

    Args:
        emails: List of email dicts with keys: business_id, email, subject, body.
    """
    try:
        supabase = get_supabase()
        saved = 0
        for item in emails:
            try:
                lead_id = item["business_id"]
                data = {
                    "lead_id": lead_id,
                    "target_email": item["email"],
                    "subject": item["subject"],
                    "body": item["body"],
                    "status": "draft",
                }
                existing = supabase.schema("outreach").table("b2b_campaign_leads").select("id").eq("lead_id", lead_id).execute()
                if existing.data:
                    supabase.schema("outreach").table("b2b_campaign_leads").update(data).eq("id", existing.data[0]["id"]).execute()
                else:
                    supabase.schema("outreach").table("b2b_campaign_leads").insert(data).execute()
                saved += 1
            except Exception as e:
                logger.warning(f"Failed to queue email: {e}")

        return json.dumps({"saved": saved})
    except Exception as e:
        logger.error(f"queue_emails_for_sending error: {e}")
        return json.dumps({"error": str(e)})


@tool
def get_dashboard_stats() -> str:
    """Fetch live SEO module dashboard KPIs including total leads, emails sent,
    open/reply rates, tier distribution, top niches, and recent activity.
    Use this when the user asks about performance or wants an overview.
    """
    try:
        import asyncio
        from app.api.routes.dashboard import get_seo_dashboard

        loop = asyncio.new_event_loop()
        try:
            result = loop.run_until_complete(get_seo_dashboard(supabase=get_supabase()))
        finally:
            loop.close()

        return json.dumps(result, default=str)
    except Exception as e:
        logger.error(f"get_dashboard_stats error: {e}")
        return json.dumps({"error": str(e)})
