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

@router.post("/generate")
async def generate_emails(request: GenerateEmailsRequest, supabase=Depends(get_supabase)):
    """
    Generate personalized SEO outreach emails for given leads.
    """
    settings = get_settings()
    api_key = settings.GROQ_API_KEY
    if not api_key:
        api_key = os.environ.get("GROQ_API_KEY")

    if not api_key:
        error_msg = "GROQ_API_KEY is not set in environment or config. Please add it to your .env file."
        logger.error(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)
        
    try:
        client = Groq(api_key=api_key)
    except Exception as e:
        logger.error(f"Failed to initialize Groq client: {e}")
        raise HTTPException(status_code=500, detail=f"Client initialization failed: {e}")

    generated_emails = []
    
    for lead in request.leads:
        if not lead.email:
            logger.info(f"Skipping {lead.business_url} - no email.")
            continue

        url = lead.website_url or 'your website'
        niche = lead.niche or 'your business'
        city = lead.city or 'your area'
        email_addr = lead.email
        score = lead.lead_score
        reasoning = lead.reasoning or 'some technical issues'

        prompt = f"""
        Business URL: {url}
        Niche: {niche}
        Location: {city}
        Audit Score: {score}/100 (where 100 is most critical)
        Technical Issues Found: {reasoning}

        Write an email to the owner. Return ONLY a JSON object with 'subject' and 'body'.
        """

        try:
            # We'll default to llama-3.1-8b-instant but allow override via env if needed
            model_name = os.environ.get("GROQ_MODEL", "llama-3.1-8b-instant")
            
            chat_completion = client.chat.completions.create(
                messages=[
                    {
                        "role": "system",
                        "content": SYSTEM_INSTRUCTION
                    },
                    {
                        "role": "user",
                        "content": prompt,
                    }
                ],
                model=model_name,
                response_format={"type": "json_object"}
            )
            
            raw_content = chat_completion.choices[0].message.content
            logger.info(f"Groq response for {url}: {raw_content[:50]}...") # Log first 50 chars for debug

            # Robust JSON extraction
            # Find the first '{' and the last '}'
            json_match = re.search(r'\{.*\}', raw_content, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
            else:
                # If no JSON block found, try cleanup or fail
                json_str = raw_content.replace('```json', '').replace('```', '').strip()
            
            try:
                email_json = json.loads(json_str, strict=False)
            except json.JSONDecodeError as e:
                logger.error(f"JSON decode error: {e}. Raw content: {raw_content}")
                raise HTTPException(status_code=500, detail=f"Groq did not return valid JSON: {raw_content}")

            # Validate that subject and body exist
            if 'subject' not in email_json or 'body' not in email_json:
                logger.warning(f"Missing subject/body in response for {url}: {email_json}")
                raise HTTPException(status_code=500, detail=f"Response missing subject or body: {email_json}")
            
            # Store to local mailbox
            outreach_data = {
                "business_id": lead.business_id,
                "business_url": url,
                "target_email": email_addr,
                "subject": email_json.get('subject', ''),
                "body": email_json.get('body', ''),
                "status": "draft",
                "created_at": datetime.now().isoformat()
            }
            try:
                mailbox = load_mailbox()
                existing_idx = next((i for i, m in enumerate(mailbox) if m.get("business_id") == lead.business_id), -1)
                if existing_idx >= 0:
                    mailbox[existing_idx].update(outreach_data)
                else:
                    mailbox.append(outreach_data)
                save_mailbox(mailbox)
            except Exception as e:
                logger.error(f"Failed to save to mailbox.json: {e}")

            generated_emails.append(outreach_data)

        except Exception as e:
            logger.exception(f"Failed to generate email for {url}: {e}")
            # Raise here for debugging
            raise HTTPException(status_code=500, detail=str(e))

    return {
        "generated": len(generated_emails),
        "data": generated_emails,
        "message": f"Emails generated successfully ({len(generated_emails)}/{len(request.leads)})"
    }
