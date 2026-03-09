"""
Dashboard / CRM Analytics Routes
─────────────────────────────────
Aggregate data from all tables to power the CRM dashboard charts.
"""
import httpx
import logging
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from app.api.deps import get_supabase
from app.core.config import get_settings

router = APIRouter()
logger = logging.getLogger(__name__)

async def get_reachinbox_stats():
    settings = get_settings()
    if not settings.REACHINBOX_API_KEY:
        return None
    
    # Last 30 days
    end_date = datetime.now().strftime("%Y-%m-%d")
    start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    
    headers = {
        "Authorization": f"Bearer {settings.REACHINBOX_API_KEY}",
        "Content-Type": "application/json"
    }
    
    async with httpx.AsyncClient(base_url=settings.REACHINBOX_BASE_URL, headers=headers) as client:
        try:
            url = f"/analytics/summary?startDate={start_date}&endDate={end_date}"
            response = await client.post(url, json={"campaignIds": [], "excludeIds": []})
            response.raise_for_status()
            return response.json().get("data")
        except Exception as e:
            logger.error(f"Failed to fetch analytics from ReachInbox: {e}")
            return None

@router.get("/stats")
async def get_dashboard_stats(supabase=Depends(get_supabase)):
    """
    Return aggregated analytics including ReachInbox data.
    """
    # 1. Total leads from Supabase
    try:
        leads_res = supabase.table("businesses").select("id", count="exact").execute()
        total_leads = leads_res.count or 0
    except:
        total_leads = 0

    # 2. Get ReachInbox analytics
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
