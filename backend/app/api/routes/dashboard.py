"""
Dashboard / CRM Analytics Routes
─────────────────────────────────
Aggregate data from all tables to power the CRM dashboard charts.
Provides module-specific endpoints for SEO, B2B, and Shopify.
"""
import httpx
import logging
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from app.api.deps import get_supabase
from app.core.config import get_settings
from sqlalchemy import create_engine, text
from app.services.shopify.config import POSTGRES_URL

router = APIRouter()
logger = logging.getLogger(__name__)

# Global engine for direct SQL access
engine = None
if POSTGRES_URL:
    try:
        engine = create_engine(POSTGRES_URL, pool_size=10, max_overflow=20)
    except Exception as e:
        logger.error(f"Failed to initialize dashboard SQL engine: {e}")



# ═══════════════════════════════════════════════════════════════
#  HELPERS
# ═══════════════════════════════════════════════════════════════

async def get_reachinbox_stats():
    settings = get_settings()
    if not settings.REACHINBOX_API_KEY:
        return None
    
    end_date = datetime.now().strftime("%Y-%m-%d")
    start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    
    headers = {
        "Authorization": f"Bearer {settings.REACHINBOX_API_KEY}",
        "Content-Type": "application/json"
    }
    
    async with httpx.AsyncClient(base_url=settings.REACHINBOX_BASE_URL, headers=headers, timeout=8.0) as client:
        try:
            url = f"/analytics/summary?startDate={start_date}&endDate={end_date}"
            response = await client.post(url, json={"campaignIds": [], "excludeIds": []})
            response.raise_for_status()
            return response.json().get("data")
        except Exception as e:
            logger.error(f"Failed to fetch analytics from ReachInbox: {e}")
            return None


def _safe_count(result):
    """Safely extract count from Supabase response."""
    try:
        return result.count or 0
    except:
        return 0


# ═══════════════════════════════════════════════════════════════
#  LEGACY ENDPOINT (kept for backwards compatibility)
# ═══════════════════════════════════════════════════════════════

@router.get("/stats")
async def get_dashboard_stats(supabase=Depends(get_supabase)):
    try:
        leads_res = supabase.table("businesses").select("id", count="exact").execute()
        total_leads = leads_res.count or 0
    except:
        total_leads = 0

    reach_stats = await get_reachinbox_stats()
    
    return {
        "total_leads": total_leads,
        "total_emails_sent": reach_stats.get("totalEmailSent", 0) if reach_stats else 0,
        "open_rate": float(reach_stats.get("openRate", 0)) if reach_stats else 0.0,
        "reply_rate": float(reach_stats.get("replyRate", 0)) if reach_stats else 0.0,
        "leads_contacted": reach_stats.get("leadsContacted", 0) if reach_stats else 0,
        "bounced": reach_stats.get("bounced", 0) if reach_stats else 0,
        "message": "Stats fetched successfully"
    }


# ═══════════════════════════════════════════════════════════════
#  SEO DASHBOARD
# ═══════════════════════════════════════════════════════════════

@router.get("/seo")
async def get_seo_dashboard(supabase=Depends(get_supabase)):
    """
    Aggregate SEO module analytics:
    - Lead counts, score distributions, outreach metrics
    """
    # 1. Total leads from common.businesses (SEO source)
    try:
        leads_res = supabase.schema("common").table("businesses").select("id", count="exact").execute()
        total_leads = _safe_count(leads_res)
    except Exception as e:
        logger.error(f"SEO leads count error: {e}")
        total_leads = 0

    # 2. Lead score distribution (tier breakdown from common.lead_scores)
    tier_counts = {"hot": 0, "warm": 0, "cold": 0}
    try:
        scores_res = supabase.schema("common").table("lead_scores").select("tier").execute()
        for row in (scores_res.data or []):
            t = (row.get("tier") or "cold").lower()
            if t in tier_counts:
                tier_counts[t] += 1
    except Exception as e:
        logger.error(f"SEO score distribution error: {e}")

    # 3. ReachInbox analytics (outreach funnel)
    reach_stats = await get_reachinbox_stats()
    emails_sent = reach_stats.get("totalEmailSent", 0) if reach_stats else 0
    open_rate = float(reach_stats.get("openRate", 0)) if reach_stats else 0.0
    reply_rate = float(reach_stats.get("replyRate", 0)) if reach_stats else 0.0
    leads_contacted = reach_stats.get("leadsContacted", 0) if reach_stats else 0
    bounced = reach_stats.get("bounced", 0) if reach_stats else 0

    # 4. Outreach email counts from outreach.emails
    outreach_counts = {"sent": 0, "opened": 0, "replied": 0}
    try:
        emails_res = supabase.schema("outreach").table("emails").select("email_sent,opened_at,replied_at").execute()
        for row in (emails_res.data or []):
            if row.get("email_sent"):
                outreach_counts["sent"] += 1
            if row.get("opened_at"):
                outreach_counts["opened"] += 1
            if row.get("replied_at"):
                outreach_counts["replied"] += 1
    except Exception as e:
        logger.error(f"SEO outreach counts error: {e}")

    # 5. Top niches
    niche_counts = {}
    try:
        niche_res = supabase.schema("common").table("businesses").select("niche").execute()
        for row in (niche_res.data or []):
            n = row.get("niche")
            if n:
                niche_counts[n] = niche_counts.get(n, 0) + 1
    except Exception as e:
        logger.error(f"SEO niche breakdown error: {e}")

    top_niches = sorted(niche_counts.items(), key=lambda x: x[1], reverse=True)[:6]

    # 6. Recent activity
    recent = []
    try:
        recent_res = supabase.schema("common").table("businesses").select("name,created_at").order("created_at", desc=True).limit(5).execute()
        for row in (recent_res.data or []):
            recent.append({
                "text": f"New lead discovered: {row.get('name', 'Unknown')}",
                "time": row.get("created_at", "")
            })
    except:
        pass

    return {
        "kpis": {
            "total_leads": total_leads,
            "emails_sent": emails_sent,
            "open_rate": round(open_rate, 1),
            "reply_rate": round(reply_rate, 1),
        },
        "tier_distribution": tier_counts,
        "outreach_funnel": outreach_counts,
        "top_niches": [{"name": n, "count": c} for n, c in top_niches],
        "reach_stats": {
            "leads_contacted": leads_contacted,
            "bounced": bounced,
        },
        "recent_activity": recent,
    }


# ═══════════════════════════════════════════════════════════════
#  B2B DASHBOARD
# ═══════════════════════════════════════════════════════════════

@router.get("/b2b")
async def get_b2b_dashboard():
    """
    Aggregate B2B module analytics using direct SQL for performance.
    """
    if not engine:
        return {
            "kpis": {"total_leads": 0, "total_companies": 0, "total_personas": 0, "total_campaigns": 0},
            "avg_score": 0, "priority_breakdown": {"High": 0, "Medium": 0, "Low": 0},
            "seniority_breakdown": {}, "campaign_funnel": {}, "top_industries": [],
            "campaigns_sent": 0, "campaigns_active": 0, "recent_activity": [],
        }
    
    try:
        with engine.connect() as conn:

            # KPI Counts
            kpi_sql = """
                SELECT 
                    (SELECT COUNT(*) FROM b2b.leads) as leads,
                    (SELECT COUNT(*) FROM b2b.companies) as companies,
                    (SELECT COUNT(*) FROM b2b.buyer_personas) as personas,
                    (SELECT COUNT(*) FROM outreach.b2b_campaigns) as campaigns,
                    (SELECT COUNT(*) FROM outreach.b2b_campaigns WHERE status = 'active') as active_campaigns,
                    (SELECT SUM(sent_count) FROM outreach.b2b_campaigns) as total_sent,
                    (SELECT COALESCE(ROUND(AVG(lead_score)::numeric, 1), 0) FROM b2b.leads) as avg_score
            """
            kpi_row = conn.execute(text(kpi_sql)).mappings().first()
            
            # Priority Breakdown
            priority_sql = """
                SELECT priority, COUNT(*) as cnt 
                FROM b2b.leads 
                GROUP BY priority
            """
            priority_rows = conn.execute(text(priority_sql)).mappings().all()
            priority_counts = {r["priority"]: int(r["cnt"]) for r in priority_rows}
            
            # Seniority Breakdown
            seniority_sql = """
                SELECT seniority, COUNT(*) as cnt 
                FROM b2b.leads 
                GROUP BY seniority
            """
            seniority_rows = conn.execute(text(seniority_sql)).mappings().all()
            seniority_counts = {str(r["seniority"]): int(r["cnt"]) for r in seniority_rows}
            
            # Campaign Funnel
            funnel_sql = """
                SELECT 
                    COUNT(*) as drafted,
                    COUNT(*) FILTER (WHERE sent_at IS NOT NULL) as sent,
                    COUNT(*) FILTER (WHERE opened_at IS NOT NULL) as opened,
                    COUNT(*) FILTER (WHERE replied_at IS NOT NULL) as replied,
                    COUNT(*) FILTER (WHERE bounced_at IS NOT NULL) as bounced
                FROM outreach.b2b_campaign_leads
            """
            funnel_row = conn.execute(text(funnel_sql)).mappings().first()
            funnel = {k: int(v) for k, v in funnel_row.items()} if funnel_row else {}
            
            # Top Industries
            industry_sql = """
                SELECT industry, COUNT(*) as cnt 
                FROM b2b.companies 
                WHERE industry IS NOT NULL 
                GROUP BY industry 
                ORDER BY cnt DESC 
                LIMIT 6
            """
            industry_rows = conn.execute(text(industry_sql)).mappings().all()
            top_industries = [{"name": r["industry"], "count": int(r["cnt"])} for r in industry_rows]
            
            # Recent Activity
            recent_sql = """
                SELECT full_name, created_at 
                FROM b2b.leads 
                ORDER BY created_at DESC 
                LIMIT 5
            """
            recent_rows = conn.execute(text(recent_sql)).mappings().all()
            recent = [
                {"text": f"Lead added: {r['full_name']}", "time": str(r["created_at"])}
                for r in recent_rows
            ]
            
        return {
            "kpis": {
                "total_leads": int(kpi_row["leads"]),
                "total_companies": int(kpi_row["companies"]),
                "total_personas": int(kpi_row["personas"]),
                "total_campaigns": int(kpi_row["campaigns"]),
            },
            "avg_score": float(kpi_row["avg_score"]),
            "priority_breakdown": priority_counts,
            "seniority_breakdown": seniority_counts,
            "campaign_funnel": funnel,
            "top_industries": top_industries,
            "campaigns_sent": int(kpi_row["total_sent"] or 0),
            "campaigns_active": int(kpi_row["active_campaigns"]),
            "recent_activity": recent,
        }
    except Exception as e:
        logger.error(f"B2B dashboard SQL error: {e}")
        return {
            "kpis": {"total_leads": 0, "total_companies": 0, "total_personas": 0, "total_campaigns": 0},
            "avg_score": 0, "priority_breakdown": {"High": 0, "Medium": 0, "Low": 0},
            "seniority_breakdown": {}, "campaign_funnel": {}, "top_industries": [],
            "campaigns_sent": 0, "campaigns_active": 0, "recent_activity": [],
        }


# ═══════════════════════════════════════════════════════════════
#  SHOPIFY DASHBOARD
# ═══════════════════════════════════════════════════════════════

@router.get("/shopify")
async def get_shopify_dashboard():
    """
    Aggregate Shopify module analytics from lead_dashboard using direct SQL.
    """
    if not engine:
        logger.error("❌ Shopify Dashboard: Engine not initialized!")
        return {
            "kpis": {"total_stores": 0, "assistants_created": 0, "hot_leads": 0, "avg_score": 0},
            "total_leads": 0, "tier_distribution": {"hot": 0, "warm": 0, "cold": 0},
            "top_niches": [], "assistant_adoption": {"created": 0, "total": 0, "rate": 0},
            "outreach": {}, "recent_activity": [],
        }
    
    try:
        with engine.connect() as conn:

            # Aggregate stats in one query
            agg_sql = """
                SELECT 
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE LOWER(tier) = 'hot') as hot,
                    COUNT(*) FILTER (WHERE LOWER(tier) = 'warm') as warm,
                    COUNT(*) FILTER (WHERE LOWER(tier) = 'cold') as cold,
                    COUNT(*) FILTER (WHERE assistant_created = true OR has_ai_assistant = true) as assistants,
                    COALESCE(ROUND(AVG(lead_score)::numeric, 1), 0) as avg_score
                FROM shopify.lead_dashboard
            """
            row = conn.execute(text(agg_sql)).mappings().first()
            
            total_leads = int(row["total"]) if row else 0
            tier_counts = {
                "hot": int(row["hot"]) if row else 0,
                "warm": int(row["warm"]) if row else 0,
                "cold": int(row["cold"]) if row else 0,
            }
            assistants_created = int(row["assistants"]) if row else 0
            avg_score = float(row["avg_score"]) if row else 0

            # Top niches
            niche_sql = """
                SELECT niche, COUNT(*) as cnt 
                FROM shopify.lead_dashboard 
                WHERE niche IS NOT NULL 
                GROUP BY niche 
                ORDER BY cnt DESC 
                LIMIT 6
            """
            niche_rows = conn.execute(text(niche_sql)).mappings().all()
            top_niches = [{"name": r["niche"], "count": int(r["cnt"])} for r in niche_rows]

            # Recent activity
            recent_sql = """
                SELECT name, tier, created_at 
                FROM shopify.lead_dashboard 
                ORDER BY created_at DESC 
                LIMIT 5
            """
            recent_rows = conn.execute(text(recent_sql)).mappings().all()
            recent = [
                {"text": f"Store discovered: {r['name']}", "tier": r.get("tier", "cold"), "time": str(r.get("created_at", ""))}
                for r in recent_rows
            ]

        adoption_rate = round((assistants_created / total_leads * 100), 1) if total_leads > 0 else 0

        return {
            "kpis": {
                "total_stores": total_leads,
                "assistants_created": assistants_created,
                "hot_leads": tier_counts.get("hot", 0),
                "avg_score": avg_score,
            },
            "total_leads": total_leads,
            "tier_distribution": tier_counts,
            "top_niches": top_niches,
            "assistant_adoption": {
                "created": assistants_created,
                "total": total_leads,
                "rate": adoption_rate,
            },
            "outreach": {},
            "recent_activity": recent,
        }
    except Exception as e:
        logger.error(f"Shopify dashboard SQL error: {e}")
        return {
            "kpis": {"total_stores": 0, "assistants_created": 0, "hot_leads": 0, "avg_score": 0},
            "total_leads": 0, "tier_distribution": {"hot": 0, "warm": 0, "cold": 0},
            "top_niches": [], "assistant_adoption": {"created": 0, "total": 0, "rate": 0},
            "outreach": {}, "recent_activity": [],
        }

