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
            return json.load(f)
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

class SendCampaignRequest(BaseModel):
    campaign_name: str
    business_ids: List[str]
    account_id: str
    scheduled_at: Optional[str] = None
    send_rate: int = 5

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

    # Process in background task
    background_tasks.add_task(process_sending, emails, account, request.send_rate)
    
    # Save campaign trace
    campaigns = load_campaigns()
    new_campaign = {
        "id": str(len(campaigns) + 1),
        "name": request.campaign_name,
        "account_id": request.account_id,
        "total_leads": len(emails),
        "scheduled_at": request.scheduled_at,
        "created_at": datetime.now().isoformat(),
        "status": "Running"
    }
    campaigns.append(new_campaign)
    save_campaigns(campaigns)

    return {
        "status": "success",
        "message": "Campaign queued for sending",
        "total": len(emails),
        "campaign_id": new_campaign["id"]
    }

async def process_sending(emails, account, rate):
    delay = 1.0 / rate if rate > 0 else 1.0
    
    for email in emails:
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
            
            # Wait for rate limiting
            await asyncio.sleep(delay)
        except Exception as e:
            logger.error(f"Failed to send email to {email['target_email']}: {e}")
            try:
                mailbox = load_mailbox()
                for m in mailbox:
                    if m.get("business_id") == b_id:
                        m["status"] = "bounced"
                save_mailbox(mailbox)
            except:
                pass

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

@router.post("/{campaign_id}/toggle")
async def toggle_campaign(campaign_id: int, action: str = Query(...)):
    # Custom toggle logic if needed in the future
    return {"status": "success", "action": action}

@router.get("/list")
async def list_campaigns():
    return load_campaigns()
