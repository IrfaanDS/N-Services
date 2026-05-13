"""
B2B Agent Tools
───────────────
Tools for the B2B domain agent. Each wraps existing service functions.
"""
import json
import logging
from langchain_core.tools import tool

from app.api.deps import get_supabase

logger = logging.getLogger(__name__)


@tool
def query_b2b_leads(
    priority: str = "",
    limit: int = 20,
) -> str:
    """Fetch B2B leads from the database with optional filters.
    Returns lead details including name, title, company, email, score, and priority tier.
    Use this when the user asks about their B2B leads or wants to see prospect data.

    Args:
        priority: Filter by priority tier ("High", "Medium", "Low"). Empty string returns all.
        limit: Maximum number of leads to return (default 20).
    """
    try:
        supabase = get_supabase()
        query = supabase.schema("b2b").table("leads").select(
            "id, full_name, email, title, phone, linkedin_url, city, country, "
            "lead_score, priority, scoring_reason, status"
        ).order("lead_score", desc=True).limit(min(limit, 50))

        if priority and priority.strip():
            query = query.eq("priority", priority.strip())

        res = query.execute()
        leads = res.data or []

        return json.dumps({
            "leads": leads,
            "total": len(leads),
        })
    except Exception as e:
        logger.error(f"query_b2b_leads error: {e}")
        return json.dumps({"error": str(e), "leads": []})


@tool
def score_b2b_leads(leads: list[dict]) -> str:
    """Run the B2B scoring algorithm on raw lead data.
    Scores based on data completeness (email +25, LinkedIn +15, company +15)
    and title seniority (C-suite +20, mid-level +10).
    Use this when the user has uploaded or provided new lead data to evaluate.

    Args:
        leads: List of lead dicts with keys like name, email, title, company, linkedin, etc.
    """
    try:
        from app.api.routes.b2b_leads import _score_b2b_lead

        scored = []
        for lead in leads:
            score, priority, reasoning = _score_b2b_lead(lead)
            scored.append({
                **lead,
                "lead_score": score,
                "priority": priority,
                "reasoning": reasoning,
            })

        scored.sort(key=lambda x: x["lead_score"], reverse=True)
        scores = [s["lead_score"] for s in scored]
        avg = round(sum(scores) / len(scores), 1) if scores else 0

        return json.dumps({
            "results": scored,
            "total": len(scored),
            "avg_score": avg,
            "high_priority": sum(1 for s in scored if s["priority"] == "High"),
        })
    except Exception as e:
        logger.error(f"score_b2b_leads error: {e}")
        return json.dumps({"error": str(e)})


@tool
def build_buyer_personas(leads: list[dict]) -> str:
    """Group leads by job title into buyer persona profiles.
    Creates persona categories (Executive, Technical, Marketing, Sales, Operations)
    with pain points and goals.
    Use this when the user wants to segment their leads by persona.

    Args:
        leads: List of lead dicts with at least a "title" field.
    """
    try:
        from app.services.b2b_email_generator import build_buyer_personas as _build

        personas = _build(leads)

        # Remove the raw leads from each persona to keep response concise
        result = []
        for p in personas:
            result.append({
                "title": p["title"],
                "role": p["role"],
                "count": p["count"],
                "primary_goal": p.get("primary_goal"),
                "pain_points": p.get("pain_points"),
            })

        return json.dumps({"personas": result, "total": len(result)})
    except Exception as e:
        logger.error(f"build_buyer_personas error: {e}")
        return json.dumps({"error": str(e)})


@tool
def generate_email_sequence(
    company_name: str,
    company_description: str,
    persona_title: str,
    persona_role: str = "Operations",
    tone: str = "professional",
    num_steps: int = 3,
) -> str:
    """Generate a multi-step email sequence for a specific buyer persona using AI.
    Returns subject lines and body text for each step in the sequence.
    Use this when the user wants to create email campaigns for a persona group.

    Args:
        company_name: The sender's company name.
        company_description: What the sender's company sells/does.
        persona_title: The target buyer's job title (e.g., "CTO").
        persona_role: The persona category ("Executive", "Technical", "Marketing", "Sales", "Operations").
        tone: Email tone ("professional", "casual", "friendly").
        num_steps: Number of emails in the sequence (1-5).
    """
    try:
        import asyncio
        from app.services.b2b_email_generator import generate_b2b_sequence

        company_profile = {
            "name": company_name,
            "what_do_you_sell": company_description,
            "what_are_the_benefits": f"Industry-leading solutions",
        }
        persona = {
            "title": persona_title,
            "role": persona_role,
            "primary_goal": f"Optimize {persona_role} performance",
            "pain_points": ["Scaling processes", "Resource constraints", "Identifying opportunities"],
        }

        loop = asyncio.new_event_loop()
        try:
            sequences = loop.run_until_complete(
                generate_b2b_sequence(company_profile, persona, num_steps, tone)
            )
        finally:
            loop.close()

        return json.dumps({"sequences": sequences, "total_steps": len(sequences)})
    except Exception as e:
        logger.error(f"generate_email_sequence error: {e}")
        return json.dumps({"error": str(e)})


@tool
def queue_emails_for_sending(emails: list[dict]) -> str:
    """Save draft emails to the outreach mailbox for review and sending.
    Each email dict should have: business_id (or lead_id), email, subject, body.
    Use this after generating emails when the user confirms they want to queue them.

    Args:
        emails: List of email dicts with keys: business_id, email, subject, body.
    """
    try:
        supabase = get_supabase()
        saved = 0
        for item in emails:
            try:
                lead_id = item.get("business_id") or item.get("lead_id")
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
    """Fetch live B2B module dashboard KPIs.
    Returns total leads, companies, personas, campaigns, avg score,
    priority breakdown, campaign funnel, and top industries.
    Use this when the user asks about B2B performance or wants an overview.
    """
    try:
        import asyncio
        from app.api.routes.dashboard import get_b2b_dashboard

        loop = asyncio.new_event_loop()
        try:
            result = loop.run_until_complete(get_b2b_dashboard())
        finally:
            loop.close()

        return json.dumps(result, default=str)
    except Exception as e:
        logger.error(f"get_dashboard_stats error: {e}")
        return json.dumps({"error": str(e)})
