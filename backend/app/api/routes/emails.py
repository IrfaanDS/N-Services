"""
Email Generation Routes
─────────────────────────
Generate personalized emails based on SEO audit data using Gemini.
"""
import os
import json
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from google import genai
from app.api.deps import get_supabase

router = APIRouter()

logger = logging.getLogger(__name__)

# Request Models
class LeadForEmail(BaseModel):
    business_id: str
    business_name: Optional[str] = None
    website_url: Optional[str] = None
    niche: Optional[str] = None
    city: Optional[str] = None
    email: Optional[str] = None
    lead_score: int = 0
    reasoning: Optional[str] = None

class GenerateEmailsRequest(BaseModel):
    leads: List[LeadForEmail]

# Gemini configuration
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
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        api_key = os.environ.get("GEMINI_API_KEY")

    if not api_key:
        error_msg = "GEMINI_API_KEY is not set in environment or config. Please add it to your .env file."
        logger.error(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)
        
    try:
        client = genai.Client(api_key=api_key)
    except Exception as e:
        logger.error(f"Failed to initialize Gemini model: {e}")
        raise HTTPException(status_code=500, detail=f"Model initialization failed: {e}")

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
            response = client.models.generate_content(
                model='gemini-2.0-flash',
                contents=f"{SYSTEM_INSTRUCTION}\n\n{prompt}",
            )
            
            raw_text = response.text.replace('```json', '').replace('```', '').strip()
            # Handle potential markdown formatting in response
            if raw_text.startswith('{') and raw_text.endswith('}'):
                 pass
            
            email_json = json.loads(raw_text)
            
            # Store back to outreach_queue
            outreach_data = {
                "business_id": lead.business_id,
                "business_url": url,
                "target_email": email_addr,
                "subject": email_json.get('subject', ''),
                "body": email_json.get('body', ''),
                "status": "draft"
            }
            # Attempt to save to database (ignoring failure if table doesn't exist yet but logging it)
            try:
                supabase.table("outreach_queue").upsert(outreach_data).execute()
            except Exception as db_e:
                logger.error(f"Failed to save to outreach_queue: {db_e}")

            generated_emails.append(outreach_data)
        except Exception as e:
            logger.error(f"Failed to generate email for {url}: {e}")

    return {
        "generated": len(generated_emails),
        "data": generated_emails,
        "message": "Emails generated successfully"
    }
