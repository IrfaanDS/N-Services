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

ACCOUNTS_FILE = os.path.join(os.path.dirname(__file__), "accounts.json")
CAMPAIGNS_FILE = os.path.join(os.path.dirname(__file__), "campaigns.json")
MAILBOX_FILE = os.path.join(os.path.dirname(__file__), "mailbox.json")
def load_accounts():
    if os.path.exists(ACCOUNTS_FILE):
        with open(ACCOUNTS_FILE, "r") as f:
            accounts = json.load(f)
        # Inject credentials from environment variables for accounts with env_key
        for acc in accounts:
            env_key = acc.get("env_key")
            if env_key:
                acc["smtp_user"] = os.environ.get(f"SMTP_USER_{env_key}", acc.get("smtp_user", ""))
                acc["smtp_pass"] = os.environ.get(f"SMTP_PASS_{env_key}", acc.get("smtp_pass", ""))
                acc["imap_user"] = os.environ.get(f"IMAP_USER_{env_key}", acc.get("imap_user", ""))
                acc["imap_pass"] = os.environ.get(f"IMAP_PASS_{env_key}", acc.get("imap_pass", ""))
        return accounts
    return []

def save_accounts(accounts):
    with open(ACCOUNTS_FILE, "w") as f:
        json.dump(accounts, f, indent=4)

def load_campaigns():
    if os.path.exists(CAMPAIGNS_FILE):
        with open(CAMPAIGNS_FILE, "r") as f:
            return json.load(f)
    return []

def save_campaigns(campaigns):
    with open(CAMPAIGNS_FILE, "w") as f:
        json.dump(campaigns, f, indent=4)

def load_mailbox():
    if os.path.exists(MAILBOX_FILE):
        try:
            with open(MAILBOX_FILE, "r") as f:
                return json.load(f)
        except:
            return []
    return []

def save_mailbox(mailbox):
    with open(MAILBOX_FILE, "w") as f:
        json.dump(mailbox, f, indent=4)

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
async def get_accounts():
    accounts = load_accounts()
    # Mask passwords
    for acc in accounts:
        acc["smtp_pass"] = "********"
        acc["imap_pass"] = "********"
    return accounts

@router.post("/accounts")
async def add_account(account: AccountPayload):
    accounts = load_accounts()
    new_acc = account.dict()
    new_acc["id"] = str(len(accounts) + 1)
    accounts.append(new_acc)
    save_accounts(accounts)
    return {"status": "success", "message": "Account added", "id": new_acc["id"]}

@router.delete("/accounts/{account_id}")
async def delete_account(account_id: str):
    accounts = load_accounts()
    accounts = [a for a in accounts if a["id"] != account_id]
    save_accounts(accounts)
    return {"status": "success", "message": "Account deleted"}

@router.put("/accounts/{account_id}")
async def update_account(account_id: str, account: AccountPayload):
    accounts = load_accounts()
    for acc in accounts:
        if acc["id"] == account_id:
            updated = account.dict()
            # If passwords were kept masked, don't overwrite them
            if updated["smtp_pass"] == "********":
                updated["smtp_pass"] = acc["smtp_pass"]
            if updated["imap_pass"] == "********":
                updated["imap_pass"] = acc["imap_pass"]
            
            updated["id"] = account_id
            acc.update(updated)
            save_accounts(accounts)
            return {"status": "success", "message": "Account updated"}
    raise HTTPException(status_code=404, detail="Account not found")

# ── Gmail Quick-Connect ──

@router.post("/accounts/gmail-quick")
async def gmail_quick_connect(payload: GmailQuickPayload):
    """One-click Gmail account setup. Auto-fills SMTP/IMAP settings."""
    accounts = load_accounts()
    new_acc = {
        "id": str(len(accounts) + 1),
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
    accounts.append(new_acc)
    save_accounts(accounts)
    return {"status": "success", "message": "Gmail account added", "id": new_acc["id"]}

# ── Test Email ──

@router.post("/accounts/{account_id}/test")
async def test_account(account_id: str, payload: TestEmailPayload = TestEmailPayload()):
    """Send a test email to verify SMTP credentials work."""
    accounts = load_accounts()
    account = next((a for a in accounts if a["id"] == account_id), None)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

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

# ── Mailbox (local data from mailbox.json) ──

@router.get("/mailbox")
async def get_mailbox(status: Optional[str] = Query(None)):
    try:
        mailbox = load_mailbox()
        if status and status != "all":
            mailbox = [m for m in mailbox if m.get("status") == status]
        return {"emails": mailbox[::-1], "total": len(mailbox)}
    except Exception as e:
        logger.error(f"Mailbox fetch error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/receive")
async def receive_emails(request: ReceiveEmailsRequest):
    mailbox = load_mailbox()
    saved = 0
    for item in request.emails:
        # Check if exists, update or append
        existing_idx = next((i for i, m in enumerate(mailbox) if m.get("business_id") == item.business_id), -1)
        
        email_data = {
            "business_id": item.business_id,
            "business_url": item.website_url or "",
            "target_email": item.email,
            "subject": item.subject,
            "body": item.body,
            "status": "draft",
            "created_at": datetime.now().isoformat()
        }
        
        if existing_idx >= 0:
            mailbox[existing_idx].update(email_data)
        else:
            mailbox.append(email_data)
        saved += 1
        
    save_mailbox(mailbox)
    return {"saved": saved, "message": f"Received {saved} emails into mailbox"}

@router.patch("/emails/{business_id}")
async def update_email_status(business_id: str, status: str = Query(...)):
    try:
        mailbox = load_mailbox()
        for m in mailbox:
            if m.get("business_id") == business_id:
                m["status"] = status
        save_mailbox(mailbox)
        return {"updated": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/send")
async def send_campaign(request: SendCampaignRequest, background_tasks: BackgroundTasks):
    # 1. Verify account
    accounts = load_accounts()
    account = next((a for a in accounts if a["id"] == request.account_id), None)
    if not account:
        raise HTTPException(status_code=404, detail="Sending account not found")

    # 2. Fetch selected emails from database
    mailbox = load_mailbox()
    emails = [m for m in mailbox if m.get("business_id") in request.business_ids]

    if not emails:
        raise HTTPException(status_code=404, detail="No emails found for the given IDs")

    # Mark as scheduled
    for m in mailbox:
        if m.get("business_id") in request.business_ids:
            m["status"] = "scheduled"
    save_mailbox(mailbox)

    # Save campaign trace
    campaigns = load_campaigns()
    new_campaign = {
        "id": str(len(campaigns) + 1),
        "name": request.campaign_name,
        "account_id": request.account_id,
        "total_leads": len(emails),
        "sent_count": 0,
        "business_ids": request.business_ids,
        "scheduled_at": request.scheduled_at,
        "created_at": datetime.now().isoformat(),
        "status": "Running"
    }
    campaigns.append(new_campaign)
    save_campaigns(campaigns)

    # Process in background task
    background_tasks.add_task(process_sending, emails, account, request.send_rate, new_campaign["id"])

    return {
        "status": "success",
        "message": "Campaign queued for sending",
        "total": len(emails),
        "campaign_id": new_campaign["id"]
    }

async def process_sending(emails, account, rate, campaign_id=None):
    delay = 1.0 / rate if rate > 0 else 1.0
    sent_count = 0
    
    for email in emails:
        # Check if campaign was paused or deleted
        if campaign_id:
            campaigns = load_campaigns()
            campaign = next((c for c in campaigns if c["id"] == campaign_id), None)
            if not campaign or campaign.get("status") == "Paused":
                logger.info(f"Campaign {campaign_id} paused/deleted, stopping sending.")
                return
        
        b_id = email.get("business_id")
        try:
            msg = EmailMessage()
            msg.set_content(email["body"])
            msg["Subject"] = email["subject"]
            msg["From"] = f"{account['name']} <{account['smtp_user']}>"
            msg["To"] = email["target_email"]
            
            # Send using SMTP synchronous in an async executor to not block server
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, send_smtp, msg, account)
            
            # Mark as sent
            mailbox = load_mailbox()
            for m in mailbox:
                if m.get("business_id") == b_id:
                    m["status"] = "sent"
            save_mailbox(mailbox)
            sent_count += 1
            
            # Update campaign sent_count
            if campaign_id:
                campaigns = load_campaigns()
                for c in campaigns:
                    if c["id"] == campaign_id:
                        c["sent_count"] = sent_count
                save_campaigns(campaigns)
            
            # Wait for rate limiting
            await asyncio.sleep(delay)
        except Exception as e:
            logger.error(f"Failed to send email to {email['target_email']}: {e}")
            sent_count += 1  # Still counts as processed
            try:
                mailbox = load_mailbox()
                for m in mailbox:
                    if m.get("business_id") == b_id:
                        m["status"] = "bounced"
                save_mailbox(mailbox)
            except:
                pass
    
    # Mark campaign as completed when all emails are processed
    if campaign_id:
        campaigns = load_campaigns()
        for c in campaigns:
            if c["id"] == campaign_id:
                c["status"] = "Completed"
                c["sent_count"] = sent_count
                c["completed_at"] = datetime.now().isoformat()
        save_campaigns(campaigns)
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
async def list_campaigns():
    return load_campaigns()

# ── Lead Management ──

@router.put("/leads/{business_id}")
async def update_lead(business_id: str, request: UpdateLeadRequest):
    mailbox = load_mailbox()
    for m in mailbox:
        if m.get("business_id") == business_id:
            if request.target_email is not None:
                m["target_email"] = request.target_email
            if request.subject is not None:
                m["subject"] = request.subject
            if request.body is not None:
                m["body"] = request.body
            if request.business_url is not None:
                m["business_url"] = request.business_url
            save_mailbox(mailbox)
            return {"status": "success", "message": "Lead updated"}
    raise HTTPException(status_code=404, detail="Lead not found")

@router.delete("/leads/{business_id}")
async def delete_lead(business_id: str):
    mailbox = load_mailbox()
    mailbox = [m for m in mailbox if m.get("business_id") != business_id]
    save_mailbox(mailbox)
    return {"status": "success", "message": "Lead deleted"}

# ── Campaign actions (dynamic routes must come AFTER static ones) ──

@router.post("/{campaign_id}/toggle")
async def toggle_campaign(campaign_id: str, action: str = Query(...)):
    campaigns = load_campaigns()
    for c in campaigns:
        if c["id"] == campaign_id:
            if action == "pause":
                c["status"] = "Paused"
            elif action == "resume":
                c["status"] = "Running"
            save_campaigns(campaigns)
            return {"status": "success", "action": action, "campaign_status": c["status"]}
    raise HTTPException(status_code=404, detail="Campaign not found")

@router.put("/{campaign_id}")
async def update_campaign(campaign_id: str, request: UpdateCampaignRequest):
    campaigns = load_campaigns()
    for c in campaigns:
        if c["id"] == campaign_id:
            if request.name is not None:
                c["name"] = request.name
            if request.send_rate is not None:
                c["send_rate"] = request.send_rate
            save_campaigns(campaigns)
            return {"status": "success", "message": "Campaign updated"}
    raise HTTPException(status_code=404, detail="Campaign not found")

@router.delete("/{campaign_id}")
async def delete_campaign(campaign_id: str):
    campaigns = load_campaigns()
    campaigns = [c for c in campaigns if c["id"] != campaign_id]
    save_campaigns(campaigns)
    return {"status": "success", "message": "Campaign deleted"}

