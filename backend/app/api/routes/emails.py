"""
Email Generation Routes
─────────────────────────
Generate personalized emails based on SEO audit data using Groq.
"""
import os
import re
import json
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from groq import Groq
from app.api.deps import get_supabase
from datetime import datetime

router = APIRouter()

logger = logging.getLogger(__name__)

MAILBOX_FILE = os.path.join(os.path.dirname(__file__), "mailbox.json")

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

# Request Models
class LeadForEmail(BaseModel):
    business_id: str
    business_name: Optional[str] = None
# ... existing code ...

    website_url: Optional[str] = None
    niche: Optional[str] = None
    city: Optional[str] = None
    email: Optional[str] = None
    lead_score: int = 0
    reasoning: Optional[str] = None

class GenerateEmailsRequest(BaseModel):
    leads: List[LeadForEmail]

# Groq configuration
SYSTEM_INSTRUCTION = """
You are a professional B2B Growth Consultant. Your goal is to write a highly personalized, 
non-spammy outreach email to a local business owner. 
Rules:
1. Reference their specific niche and city naturally.
2. Address the specific SEO 'reasoning' issues found during the audit as 'missed opportunities'.
3. Use a helpful, consultative tone (not a sales pitch).
4. Keep the email under 150 words.
5. Mention their URL to show you actually visited the site.
Return ONLY a JSON object with 'subject' and 'body'.
"""

from app.core.config import get_settings

from app.services.seo_emails import process_batch_seo_emails

@router.post("/generate")
async def generate_emails(request: GenerateEmailsRequest):
    """
    Generate personalized SEO outreach emails for given leads.
    """
    business_ids = [lead.business_id for lead in request.leads]
    
    try:
        generated_emails = process_batch_seo_emails(business_ids)
        
        # Save to local mailbox for demo/caching purposes
        mailbox = load_mailbox()
        for outreach_data in generated_emails:
            existing_idx = next((i for i, m in enumerate(mailbox) if m.get("business_id") == outreach_data["business_id"]), -1)
            if existing_idx >= 0:
                mailbox[existing_idx].update(outreach_data)
            else:
                mailbox.append(outreach_data)
        save_mailbox(mailbox)
        
        return {
            "generated": len(generated_emails),
            "data": generated_emails,
            "message": f"Emails generated successfully ({len(generated_emails)}/{len(request.leads)})"
        }
    except Exception as e:
        logger.exception(f"Batch generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
