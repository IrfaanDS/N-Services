"""
Email Sending Routes (Custom Sending System)
─────────────────────────────────────────────
Local mailbox management and custom SMTP/IMAP integration.
Supports campaign creation, scheduling, rate-limited sending,
and per-lead unique emails via custom variables.
"""
import asyncio
import logging
import smtplib
import json
import os
from datetime import datetime
from email.message import EmailMessage
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from pydantic import BaseModel
from app.api.deps import get_supabase

router = APIRouter()
logger = logging.getLogger(__name__)

# ── Request / Response Models ──

class EmailPayload(BaseModel):
    business_id: str
    business_name: Optional[str] = None
    website_url: Optional[str] = None
    email: str
    subject: str
    body: str

class ReceiveEmailsRequest(BaseModel):
    emails: List[EmailPayload]

class AccountPayload(BaseModel):
    name: str 
    smtp_host: str
    smtp_port: int
    smtp_user: str
    smtp_pass: str
    imap_host: str
    imap_port: int
    imap_user: str
    imap_pass: str

class GmailQuickPayload(BaseModel):
    name: str
    email: str
    app_password: str

class TestEmailPayload(BaseModel):
    recipient: Optional[str] = None  # defaults to the account's own smtp_user

class SendCampaignRequest(BaseModel):
    campaign_name: str
    business_ids: List[str]
    account_id: str
    scheduled_at: Optional[str] = None
    send_rate: int = 5

class UpdateCampaignRequest(BaseModel):
    name: Optional[str] = None
    send_rate: Optional[int] = None

class UpdateLeadRequest(BaseModel):
    target_email: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None
    business_url: Optional[str] = None

# ── Accounts Management ──

@router.get("/accounts")
async def get_accounts(supabase=Depends(get_supabase)):
    res = supabase.schema("outreach").table("b2b_sending_accounts").select("*").execute()
    accounts = res.data or []
    # Mask passwords
    for acc in accounts:
        acc["smtp_pass"] = "********"
        acc["imap_pass"] = "********"
    return accounts

@router.post("/accounts")
async def add_account(account: AccountPayload, supabase=Depends(get_supabase)):
    data = account.dict()
    res = supabase.schema("outreach").table("b2b_sending_accounts").insert(data).execute()
    if not res.data:
        raise HTTPException(400, "Failed to add account")
    return {"status": "success", "message": "Account added", "id": res.data[0]["id"]}

@router.delete("/accounts/{account_id}")
async def delete_account(account_id: str, supabase=Depends(get_supabase)):
    supabase.schema("outreach").table("b2b_sending_accounts").delete().eq("id", account_id).execute()
    return {"status": "success", "message": "Account deleted"}

@router.put("/accounts/{account_id}")
async def update_account(account_id: str, account: AccountPayload, supabase=Depends(get_supabase)):
    data = account.dict()
    # If passwords were kept masked, don't overwrite them
    if data.get("smtp_pass") == "********":
        del data["smtp_pass"]
    if data.get("imap_pass") == "********":
        del data["imap_pass"]
        
    res = supabase.schema("outreach").table("b2b_sending_accounts").update(data).eq("id", account_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Account not found")
    return {"status": "success", "message": "Account updated"}

# ── Gmail Quick-Connect ──

@router.post("/accounts/gmail-quick")
async def gmail_quick_connect(payload: GmailQuickPayload, supabase=Depends(get_supabase)):
    """One-click Gmail account setup. Auto-fills SMTP/IMAP settings."""
    data = {
        "name": payload.name,
        "smtp_host": "smtp.gmail.com",
        "smtp_port": 587,
        "smtp_user": payload.email,
        "smtp_pass": payload.app_password,
        "imap_host": "imap.gmail.com",
        "imap_port": 993,
        "imap_user": payload.email,
        "imap_pass": payload.app_password,
    }
    res = supabase.schema("outreach").table("b2b_sending_accounts").insert(data).execute()
    if not res.data:
        raise HTTPException(400, "Failed to connect Gmail")
    return {"status": "success", "message": "Gmail account added", "id": res.data[0]["id"]}

# ── Test Email ──

@router.post("/accounts/{account_id}/test")
async def test_account(account_id: str, payload: TestEmailPayload = TestEmailPayload(), supabase=Depends(get_supabase)):
    """Send a test email to verify SMTP credentials work."""
    res = supabase.schema("outreach").table("b2b_sending_accounts").select("*").eq("id", account_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Account not found")
    account = res.data[0]

    recipient = payload.recipient or account["smtp_user"]
    msg = EmailMessage()
    msg.set_content("This is a test email from LeadFlow SEO to verify your sending domain is working correctly.\n\nIf you see this, your SMTP credentials are set up properly!")
    msg["Subject"] = "✅ LeadFlow SEO - Test Email"
    msg["From"] = f"{account['name']} <{account['smtp_user']}>"
    msg["To"] = recipient

    try:
        send_smtp(msg, account)
        return {"status": "success", "message": f"Test email sent to {recipient}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SMTP test failed: {str(e)}")

@router.post("/accounts/{account_id}/test-imap")
async def test_imap_connection(account_id: str, supabase=Depends(get_supabase)):
    """Verify IMAP credentials work."""
    import imaplib
    res = supabase.schema("outreach").table("b2b_sending_accounts").select("*").eq("id", account_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Account not found")
    account = res.data[0]

    if not account.get("imap_host"):
        raise HTTPException(status_code=400, detail="IMAP host not configured")

    try:
        mail = imaplib.IMAP4_SSL(account["imap_host"], account.get("imap_port", 993))
        mail.login(account["imap_user"], account["imap_pass"])
        mail.select("INBOX")
        mail.logout()
        return {"status": "success", "message": "IMAP connection successful"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"IMAP test failed: {str(e)}")

# ── Mailbox (local data from mailbox.json) ──

@router.get("/mailbox")
async def get_mailbox(status: Optional[str] = Query(None), supabase=Depends(get_supabase)):
    """Fetch leads from outreach.b2b_campaign_leads and enrich with details."""
    try:
        # 1. Fetch base campaign leads
        query = supabase.schema("outreach").table("b2b_campaign_leads").select("*")
        if status and status != "all":
            query = query.eq("status", status)
        
        res = query.execute()
        data = res.data or []
        
        if not data:
            return {"emails": [], "total": 0}

        # 2. Collect lead IDs to fetch details
        lead_ids = [row["lead_id"] for row in data if row.get("lead_id")]
        
        # 3. Fetch lead details from b2b.leads (cross-schema manual join)
        lead_map = {}
        if lead_ids:
            try:
                # We fetch from b2b schema separately
                lead_res = supabase.schema("b2b").table("leads").select(
                    "id, full_name, email, title"
                ).in_("id", lead_ids).execute()
                for l in (lead_res.data or []):
                    lead_map[l["id"]] = l
            except Exception as e:
                logger.warning(f"Could not enrich from b2b.leads: {e}")

        # 4. Format response
        emails = []
        for row in data:
            lead_detail = lead_map.get(row["lead_id"], {})
            emails.append({
                "id": row["id"],
                "business_id": row["lead_id"],
                "business_name": lead_detail.get("full_name") or row.get("business_name") or "Lead",
                "business_url": row.get("website_url") or "",
                "target_email": row.get("target_email") or lead_detail.get("email"),
                "subject": row["subject"],
                "body": row["body"],
                "status": row["status"],
                "created_at": row["created_at"],
                "type": "b2b" if lead_detail else "seo",
                "persona": lead_detail.get("title", "Lead")
            })
            
        return {"emails": emails[::-1], "total": len(emails)}
    except Exception as e:
        logger.error(f"Mailbox fetch error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/receive")
async def receive_emails(request: ReceiveEmailsRequest, supabase=Depends(get_supabase)):
    """
    Receive generated emails and save them to the outreach queue.
    Handles both B2B leads and SEO businesses by ensuring the lead exists in b2b.leads.
    """
    saved = 0
    errors = []
    for item in request.emails:
        try:
            lead_id = item.business_id
            
            # 1. Ensure lead exists in b2b.leads (SEO compatibility)
            # Check if lead exists
            lead_res = supabase.schema("b2b").table("leads").select("id").eq("id", lead_id).execute()
            if not lead_res.data:
                # If not, try to find business in common.businesses
                biz_res = supabase.schema("common").table("businesses").select("*").eq("id", lead_id).execute()
                if biz_res.data:
                    biz = biz_res.data[0]
                    # Ensure company exists in b2b.companies
                    comp_res = supabase.schema("b2b").table("companies").select("id").eq("business_id", lead_id).execute()
                    if not comp_res.data:
                        comp_data = {
                            "business_id": lead_id,
                            "industry": biz.get("niche") or "SEO",
                            "website_domain": (biz.get("website_url") or "").replace("https://", "").replace("http://", "").split("/")[0]
                        }
                        comp_res = supabase.schema("b2b").table("companies").insert(comp_data).execute()
                    
                    if comp_res.data:
                        comp_id = comp_res.data[0]["id"]
                        # Create lead entry
                        lead_data = {
                            "id": lead_id,
                            "company_id": comp_id,
                            "business_id": lead_id,
                            "full_name": item.business_name or biz.get("name") or "Lead",
                            "email": item.email,
                            "title": "Owner/Manager",
                            "status": "new"
                        }
                        supabase.schema("b2b").table("leads").insert(lead_data).execute()

            # 2. Manual Upsert into outreach.b2b_campaign_leads
            data = {
                "lead_id": lead_id,
                "target_email": item.email,
                "subject": item.subject,
                "body": item.body,
                "status": "draft"
            }
            
            # Check if lead already exists in the outreach queue
            existing = supabase.schema("outreach").table("b2b_campaign_leads").select("id").eq("lead_id", lead_id).execute()
            
            if existing.data:
                # Update existing draft
                supabase.schema("outreach").table("b2b_campaign_leads").update(data).eq("id", existing.data[0]["id"]).execute()
            else:
                # Insert new draft
                supabase.schema("outreach").table("b2b_campaign_leads").insert(data).execute()
            
            saved += 1
        except Exception as e:
            logger.error(f"Failed to receive email for {item.business_id}: {e}")
            errors.append(str(e))
            
    return {"saved": saved, "message": f"Received {saved} emails into Supabase", "errors": errors if errors else None}

@router.patch("/emails/{business_id}")
async def update_email_status(business_id: str, status: str = Query(...), supabase=Depends(get_supabase)):
    try:
        res = supabase.schema("outreach").table("b2b_campaign_leads").update({"status": status}).eq("lead_id", business_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Lead not found in mailbox")
        return {"updated": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/send")
async def send_campaign(request: SendCampaignRequest, background_tasks: BackgroundTasks, supabase=Depends(get_supabase)):
    """
    Start a sending campaign using Supabase.
    """
    # 1. Verify account
    acc_res = supabase.schema("outreach").table("b2b_sending_accounts").select("*").eq("id", request.account_id).execute()
    if not acc_res.data:
        raise HTTPException(status_code=404, detail="Sending account not found")
    account = acc_res.data[0]

    # 2. Create Campaign
    camp_data = {
        "name": request.campaign_name,
        "account_id": request.account_id,
        "status": "Running",
        "total_leads": len(request.business_ids),
        "send_rate": request.send_rate
    }
    try:
        camp_res = supabase.schema("outreach").table("b2b_campaigns").insert(camp_data).execute()
        if not camp_res.data:
            raise HTTPException(400, "Failed to create campaign")
        campaign_id = camp_res.data[0]["id"]
    except Exception as e:
        logger.error(f"Campaign creation error: {e}")
        raise HTTPException(status_code=500, detail=f"Database error while creating campaign: {str(e)}")

    # 3. Fetch and schedule leads
    leads_res = supabase.schema("outreach").table("b2b_campaign_leads").select("*").in_("lead_id", request.business_ids).execute()
    leads_to_send = leads_res.data or []
    
    if not leads_to_send:
        raise HTTPException(400, "No leads found in mailbox for selected IDs")

    for lead in leads_to_send:
        supabase.schema("outreach").table("b2b_campaign_leads").update({
            "campaign_id": campaign_id,
            "status": "scheduled"
        }).eq("id", lead["id"]).execute()

    # 4. Process in background task
    background_tasks.add_task(process_sending, leads_to_send, account, request.send_rate, campaign_id)

    return {
        "status": "success",
        "message": "Campaign queued for sending",
        "total": len(leads_to_send),
        "campaign_id": campaign_id
    }

async def process_sending(leads, account, rate, campaign_id):
    delay = 1.0 / rate if rate > 0 else 1.0
    sent_count = 0
    supabase = get_supabase()
    
    for lead in leads:
        # Check if campaign was paused or deleted
        camp_res = supabase.schema("outreach").table("b2b_campaigns").select("status").eq("id", campaign_id).execute()
        if not camp_res.data or camp_res.data[0]["status"] == "Paused":
            logger.info(f"Campaign {campaign_id} paused or not found, stopping.")
            return
        
        lead_id_in_table = lead["id"]
        try:
            msg = EmailMessage()
            msg.set_content(lead["body"])
            msg["Subject"] = lead["subject"]
            msg["From"] = f"{account['name']} <{account['smtp_user']}>"
            msg["To"] = lead["target_email"]
            
            # Send using SMTP
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, send_smtp, msg, account)
            
            # Mark lead as sent
            supabase.schema("outreach").table("b2b_campaign_leads").update({
                "status": "sent",
                "sent_at": datetime.now().isoformat()
            }).eq("id", lead_id_in_table).execute()
            
            sent_count += 1
            
            # Update campaign sent_count
            supabase.schema("outreach").table("b2b_campaigns").update({
                "sent_count": sent_count
            }).eq("id", campaign_id).execute()
            
            await asyncio.sleep(delay)
        except Exception as e:
            logger.error(f"Failed to send email to {lead['target_email']}: {e}")
            supabase.schema("outreach").table("b2b_campaign_leads").update({
                "status": "failed"
            }).eq("id", lead_id_in_table).execute()
            
    # Mark campaign as completed
    supabase.schema("outreach").table("b2b_campaigns").update({
        "status": "Completed",
        "completed_at": datetime.now().isoformat()
    }).eq("id", campaign_id).execute()
    logger.info(f"Campaign {campaign_id} finished. Sent {sent_count} emails.")
    
    # Mark campaign as completed when all emails are processed
    logger.info(f"Campaign {campaign_id} completed. Sent {sent_count} emails.")

def send_smtp(msg, account):
    try:
        if account['smtp_port'] == 465:
            with smtplib.SMTP_SSL(account['smtp_host'], account['smtp_port']) as server:
                server.login(account['smtp_user'], account['smtp_pass'])
                server.send_message(msg)
        else:
            with smtplib.SMTP(account['smtp_host'], account['smtp_port']) as server:
                server.starttls()
                server.login(account['smtp_user'], account['smtp_pass'])
                server.send_message(msg)
    except Exception as e:
        logger.error(f"SMTP error: {e}")
        raise e

@router.get("/list")
async def list_campaigns(supabase=Depends(get_supabase)):
    res = supabase.schema("outreach").table("b2b_campaigns").select("*").order("created_at", desc=True).execute()
    return res.data or []


# ── Lead Management ──

@router.put("/leads/{lead_id}")
async def update_lead(lead_id: str, request: UpdateLeadRequest, supabase=Depends(get_supabase)):
    data = {k: v for k, v in request.dict().items() if v is not None}
    res = supabase.schema("outreach").table("b2b_campaign_leads").update(data).eq("lead_id", lead_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"status": "success", "message": "Lead updated"}


@router.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str, supabase=Depends(get_supabase)):
    supabase.schema("outreach").table("b2b_campaign_leads").delete().eq("lead_id", lead_id).execute()
    return {"status": "success", "message": "Lead deleted"}


# ── Campaign actions ──

@router.post("/{campaign_id}/toggle")
async def toggle_campaign(campaign_id: str, action: str = Query(...), supabase=Depends(get_supabase)):
    status = "Paused" if action == "pause" else "Running"
    res = supabase.schema("outreach").table("b2b_campaigns").update({"status": status}).eq("id", campaign_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return {"status": "success", "action": action, "campaign_status": status}


@router.put("/{campaign_id}")
async def update_campaign(campaign_id: str, request: UpdateCampaignRequest, supabase=Depends(get_supabase)):
    data = {k: v for k, v in request.dict().items() if v is not None}
    res = supabase.schema("outreach").table("b2b_campaigns").update(data).eq("id", campaign_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return {"status": "success", "message": "Campaign updated"}


@router.delete("/{campaign_id}")
async def delete_campaign(campaign_id: str, supabase=Depends(get_supabase)):
    # Cascading delete should handle campaign_leads if foreign keys are set up, 
    # but we'll do it manually to be safe if needed.
    supabase.schema("outreach").table("b2b_campaigns").delete().eq("id", campaign_id).execute()
    return {"status": "success", "message": "Campaign deleted"}

