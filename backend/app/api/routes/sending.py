"""
Email Sending Routes (ReachInbox Integration)
─────────────────────────────────────────────
Create campaigns, configure sequences, and send emails
via the ReachInbox API.
"""
import httpx
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.api.deps import get_supabase
from app.core.config import get_settings

router = APIRouter()
logger = logging.getLogger(__name__)

class MoveLeadsRequest(BaseModel):
    campaign_name: str
    business_ids: List[str]

async def get_reachinbox_client():
    settings = get_settings()
    if not settings.REACHINBOX_API_KEY:
        raise HTTPException(status_code=500, detail="ReachInbox API Key not configured")
    
    headers = {
        "Authorization": f"Bearer {settings.REACHINBOX_API_KEY}",
        "Content-Type": "application/json"
    }
    return httpx.AsyncClient(base_url=settings.REACHINBOX_BASE_URL, headers=headers)

@router.get("/")
async def list_campaigns():
    """List all campaigns from ReachInbox."""
    async with await get_reachinbox_client() as client:
        try:
            response = await client.get("/campaigns")
            response.raise_for_status()
            data = response.json()
            return data.get("data", [])
        except Exception as e:
            logger.error(f"Failed to fetch campaigns: {e}")
            raise HTTPException(status_code=500, detail=f"ReachInbox error: {e}")

@router.post("/move")
async def move_leads_to_reachinbox(request: MoveLeadsRequest, supabase=Depends(get_supabase)):
    """
    Take generated emails from outreach_queue and create a ReachInbox campaign.
    """
    settings = get_settings()
    
    # 1. Fetch data from Supabase
    try:
        leads_res = supabase.table("outreach_queue").select("*").in_("business_id", request.business_ids).execute()
        leads_data = leads_res.data
        if not leads_data:
            raise HTTPException(status_code=404, detail="No leads found in outreach_queue for provided IDs")
    except Exception as e:
        logger.error(f"Supabase error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch leads from database")

    async with await get_reachinbox_client() as client:
        # 2. Create Campaign
        try:
            camp_res = await client.post("/campaigns/create", json={"name": request.campaign_name})
            camp_res.raise_for_status()
            campaign = camp_res.json().get("data")
            campaign_id = campaign["id"]
        except Exception as e:
            logger.error(f"Failed to create campaign: {e}")
            raise HTTPException(status_code=500, detail=f"ReachInbox creation failed: {e}")

        # 3. Add Sequence (with variables)
        try:
            seq_payload = {
                "campaignId": campaign_id,
                "sequences": [{
                    "steps": [{
                        "variants": [{
                            "subject": "{{custom_subject}}",
                            "body": "{{custom_body}}"
                        }],
                        "type": "initial",
                        "delay": 0,
                        "ccEnabled": False,
                        "bccEnabled": False
                    }]
                }]
            }
            seq_res = await client.post("/campaigns/add-sequence", json=seq_payload)
            seq_res.raise_for_status()
        except Exception as e:
            logger.error(f"Failed to add sequence: {e}")
            # Non-blocking error, but important
            
        # 4. Add Leads with their unique content
        reach_leads = []
        for l in leads_data:
            reach_leads.append({
                "email": l["target_email"],
                "custom_subject": l["subject"],
                "custom_body": l["body"]
            })
            
        try:
            leads_payload = {
                "campaignId": str(campaign_id),
                "leads": reach_leads,
                "newCoreVariables": ["custom_subject", "custom_body"],
                "duplicates": []
            }
            leads_res = await client.post("/leads/add", json=leads_payload)
            leads_res.raise_for_status()
        except Exception as e:
            logger.error(f"Failed to add leads: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to add leads to ReachInbox: {e}")

        # 5. Update Status in Supabase
        try:
            supabase.table("outreach_queue").update({"status": "sent"}).in_("business_id", request.business_ids).execute()
        except:
            pass

        return {
            "status": "success",
            "campaign_id": campaign_id,
            "message": f"Successfully moved {len(reach_leads)} leads to campaign '{request.campaign_name}'"
        }

@router.post("/{campaign_id}/toggle")
async def toggle_campaign(campaign_id: int, action: str):
    """Start or Pause a campaign."""
    path = "/campaigns/start" if action == "start" else "/campaigns/pause"
    async with await get_reachinbox_client() as client:
        try:
            res = await client.post(path, json={"campaignId": campaign_id})
            res.raise_for_status()
            return res.json()
        except Exception as e:
            logger.error(f"Failed to {action} campaign: {e}")
            raise HTTPException(status_code=500, detail=str(e))
