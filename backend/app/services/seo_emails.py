"""
SEO Email Generation Service
─────────────────────────────
Core logic for generating personalized SEO outreach emails using Groq.
Used by the /api/emails/generate route and the background Celery task.
"""
import os
import re
import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

from groq import Groq
from app.core.config import get_settings
from app.api.deps import get_supabase
from app.api.routes.evaluation import _fetch_and_score

logger = logging.getLogger(__name__)

# System instruction for the AI model
SYSTEM_INSTRUCTION = """
You are a professional B2B Growth Consultant specializing in SEO for local businesses.
Your goal is to write a highly personalized, non-spammy outreach email to a business owner.

Rules:
1. Reference their specific niche and city naturally (e.g., 'As a top-rated plumber in Dallas...').
2. Address the specific SEO 'reasoning' issues found during the audit as 'missed opportunities' for growth.
3. Use a helpful, consultative tone (not a high-pressure sales pitch).
4. Keep the email concise (under 150 words).
5. Mention their website URL to show you have actually reviewed their site.
6. The subject line should be professional and intriguing, not 'clickbaity'.

Return ONLY a JSON object with 'subject' and 'body' fields.
"""

def generate_seo_outreach_email(
    website_url: str,
    niche: str,
    city: str,
    lead_score: int,
    reasoning: str,
    model: str = "llama-3.1-8b-instant"
) -> Dict[str, str]:
    """
    Generates a single personalized SEO outreach email using Groq.
    
    Args:
        website_url: The business website URL
        niche: The business niche (e.g., 'Plumber')
        city: The business location
        lead_score: The SEO priority score (0-100)
        reasoning: The technical issues found during audit
        model: The Groq model to use
        
    Returns:
        Dict containing 'subject' and 'body'
    """
    settings = get_settings()
    api_key = settings.GROQ_API_KEY or os.environ.get("GROQ_API_KEY")

    if not api_key:
        raise ValueError("GROQ_API_KEY is not configured. Please add it to your environment variables.")

    client = Groq(api_key=api_key)
    
    prompt = f"""
    Business URL: {website_url}
    Niche: {niche}
    Location: {city}
    Audit Score: {lead_score}/100 (where 100 indicates high potential for improvement)
    Technical Issues Found: {reasoning}

    Task: Write a personalized outreach email to the business owner. 
    Return ONLY a JSON object with 'subject' and 'body'.
    """

    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": SYSTEM_INSTRUCTION},
                {"role": "user", "content": prompt},
            ],
            model=model,
            response_format={"type": "json_object"}
        )
        
        raw_content = chat_completion.choices[0].message.content
        
        # Robust JSON extraction
        json_match = re.search(r'\{.*\}', raw_content, re.DOTALL)
        json_str = json_match.group(0) if json_match else raw_content
        
        email_json = json.loads(json_str, strict=False)
        
        if 'subject' not in email_json or 'body' not in email_json:
            raise ValueError(f"AI response missing required fields: {email_json}")
            
        return email_json

    except Exception as e:
        logger.error(f"Groq email generation failed for {website_url}: {str(e)}")
        raise

def process_batch_seo_emails(business_ids: List[str]) -> List[Dict[str, Any]]:
    """
    Fetches lead data from Supabase and generates outreach emails for each lead.
    
    Args:
        business_ids: List of business IDs to process
        
    Returns:
        List of generated email objects with metadata
    """
    supabase = get_supabase()
    
    # 1. Fetch lead data and SEO audit findings
    scored_leads = _fetch_and_score(supabase, business_ids)
    
    generated_emails = []
    
    for lead in scored_leads:
        # Skip leads without an email address
        if not lead.get("email"):
            logger.warning(f"Skipping business_id {lead['business_id']} - no contact email available.")
            continue
            
        try:
            # 2. Call the generation logic
            email_content = generate_seo_outreach_email(
                website_url=lead.get("website_url") or "your website",
                niche=lead.get("niche") or "your business",
                city=lead.get("city") or "your area",
                lead_score=lead.get("lead_score", 0),
                reasoning=lead.get("reasoning", "general technical improvements needed")
            )
            
            # 3. Format the result
            outreach_data = {
                "business_id": lead["business_id"],
                "business_name": lead.get("business_name"),
                "business_url": lead.get("website_url"),
                "target_email": lead["email"],
                "subject": email_content["subject"],
                "body": email_content["body"],
                "status": "draft",
                "lead_score": lead.get("lead_score"),
                "created_at": datetime.now().isoformat()
            }
            generated_emails.append(outreach_data)
            
        except Exception as e:
            logger.error(f"Failed to generate email for business_id {lead['business_id']}: {str(e)}")
            
    return generated_emails

if __name__ == "__main__":
    # Standalone execution for testing
    import sys
    logging.basicConfig(level=logging.INFO)
    
    # Example usage: python -m app.services.seo_emails [business_id1] [business_id2]
    if len(sys.argv) > 1:
        ids = sys.argv[1:]
        print(f"Generating SEO emails for {len(ids)} leads...")
        results = process_batch_seo_emails(ids)
        print(json.dumps(results, indent=2))
    else:
        print("Usage: python -m app.services.seo_emails <business_id1> <business_id2> ...")
