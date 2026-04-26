"""
B2B Email Generation Routes
─────────────────────────────
Proxy to the Smythos generate_sequences API for AI-powered
email sequence generation based on buyer personas.
"""
import json
import logging
import time
from typing import Optional, List, Dict, Any

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.config import get_settings

router = APIRouter()
logger = logging.getLogger(__name__)


# ─── Request Models ───

class CompanyProfile(BaseModel):
    name: str
    industry: str
    description: str
    what_do_you_sell: str
    who_do_you_sell_to: str
    what_are_the_benefits: str
    website_url: Optional[str] = ""


class BusinessProfile(BaseModel):
    industries: List[str] = []
    technographics: List[str] = []
    firmographics: Dict[str, Any] = {}
    psychographics: Dict[str, Any] = {}
    geographic_markets: List[str] = []


class BuyerPersona(BaseModel):
    title: str
    role: str
    responsibilities: List[str] = []
    primary_goal: str = ""
    pain_points: List[str] = []
    desired_outcomes: List[str] = []
    problems_we_solve: List[str] = []


class GenerateSequencesRequest(BaseModel):
    company: CompanyProfile
    business_profile: Optional[BusinessProfile] = None
    buyer_personas: List[BuyerPersona]
    num_sequences: int = 3
    tone: str = "professional"


# ─── Helper: Build optimized personas from leads ───

def build_personas_from_leads(leads: List[dict]) -> List[dict]:
    """
    Group leads by title/role and build buyer personas automatically.
    """
    title_groups = {}
    for lead in leads:
        title = (lead.get("title") or "Business Professional").strip()
        if title not in title_groups:
            title_groups[title] = []
        title_groups[title].append(lead)

    personas = []
    for title, group_leads in title_groups.items():
        # Determine role from title
        title_lower = title.lower()
        if any(kw in title_lower for kw in ["ceo", "founder", "owner", "president"]):
            role = "Executive Leadership"
        elif any(kw in title_lower for kw in ["cto", "vp eng", "engineering"]):
            role = "Technical Leadership"
        elif any(kw in title_lower for kw in ["cmo", "marketing", "growth"]):
            role = "Marketing Leadership"
        elif any(kw in title_lower for kw in ["sales", "revenue", "commercial"]):
            role = "Sales Leadership"
        elif any(kw in title_lower for kw in ["hr", "people", "talent"]):
            role = "People & HR Leadership"
        elif any(kw in title_lower for kw in ["cfo", "finance", "accounting"]):
            role = "Finance Leadership"
        else:
            role = "Business Leadership"

        personas.append({
            "title": title,
            "role": role,
            "responsibilities": [
                f"Oversee {role.lower()} functions",
                "Drive strategic initiatives",
                "Manage team performance and growth",
            ],
            "primary_goal": f"Improve operational efficiency and drive business results",
            "pain_points": [
                "Time-consuming manual processes",
                "Difficulty finding reliable service providers",
                "Need to demonstrate clear ROI on investments",
            ],
            "desired_outcomes": [
                "Streamlined operations",
                "Measurable business impact",
                "Trusted partnership with proven experts",
            ],
            "problems_we_solve": [
                "End-to-end service delivery with measurable outcomes",
                "Dedicated support and transparent reporting",
                "Industry-specific expertise and best practices",
            ],
        })

    return personas


def normalize_smythos_output(data: Any) -> List[Dict[str, Any]]:
    """
    Normalizes various Smythos response formats into a standardized list of persona groups.
    Expected output format:
    [
        {
            "persona_title": "...",
            "emails": [
                { "subject": "...", "body": "...", "sequence_number": 1 },
                ...
            ]
        }
    ]
    """
    output = None
    
    # 1. Extract the core data from Smythos wrapper
    if isinstance(data, list):
        output = data
    elif isinstance(data, dict):
        # Try known wrapper patterns
        if isinstance(data.get("result"), dict):
            output = data.get("result", {}).get("Output") or data.get("result")
        
        if not output:
            output = data.get("Output") or data.get("data") or data.get("sequences") or data.get("result")
        
        # Fallback to entire object if it's not a standard error/status wrapper
        if not output and len(data) > 0:
            if not (len(data) == 1 and ("status" in data or "message" in data)):
                output = data
    else:
        output = data

    # 2. If it's a string, try to parse it as JSON
    if isinstance(output, str):
        try:
            # Clean up potential markdown formatting if Smythos returns it
            cleaned_output = output.strip()
            if cleaned_output.startswith("```json"):
                cleaned_output = cleaned_output.replace("```json", "", 1).rsplit("```", 1)[0].strip()
            elif cleaned_output.startswith("```"):
                cleaned_output = cleaned_output.replace("```", "", 1).rsplit("```", 1)[0].strip()
            
            output = json.loads(cleaned_output)
        except json.JSONDecodeError:
            # Not JSON, keep as string for raw wrap
            pass

    # 3. Final normalization into List[Dict]
    final_output = []
    
    if isinstance(output, list):
        if len(output) == 0:
            return []
        
        # Check if it's a list of groups (has 'emails') or list of emails directly
        first_item = output[0]
        if isinstance(first_item, dict):
            if "emails" in first_item:
                # Format: [{ persona_title, emails: [...] }]
                for group in output:
                    final_output.append({
                        "persona_title": group.get("persona_title") or group.get("title") or "Generated Sequence",
                        "emails": group.get("emails") or []
                    })
            elif "subject" in first_item or "body" in first_item:
                # Format: [{ subject, body }] - list of emails directly
                final_output.append({
                    "persona_title": "Generated Sequence",
                    "emails": output
                })
            else:
                # List of unknown dicts, just wrap them
                final_output.append({
                    "persona_title": "Raw Data List",
                    "emails": [{"subject": "Raw Item", "body": json.dumps(item, indent=2)} for item in output]
                })
        else:
            # List of strings or other
            final_output.append({
                "persona_title": "Raw Content List",
                "emails": [{"subject": "Part " + str(i+1), "body": str(item)} for i, item in enumerate(output)]
            })

    elif isinstance(output, dict):
        if "emails" in output:
            # Single group object
            final_output.append({
                "persona_title": output.get("persona_title") or output.get("title") or "Generated Sequence",
                "emails": output.get("emails") or []
            })
        elif "subject" in output or "body" in output:
            # Single email object
            final_output.append({
                "persona_title": "Generated Email",
                "emails": [output]
            })
        else:
            # Random dict, wrap it
            final_output.append({
                "persona_title": "Raw Data Object",
                "emails": [{"subject": "Raw Data", "body": json.dumps(output, indent=2)}]
            })
    
    elif output:
        # String or other raw value
        final_output.append({
            "persona_title": "Raw Smythos Output",
            "emails": [{
                "subject": "AI Generated Content",
                "body": str(output),
                "sequence_number": 1
            }]
        })

    # LAST RESORT: If we still have nothing but data exists
    if not final_output and data:
        final_output = [{
            "persona_title": "Raw Response Catch-all",
            "emails": [{
                "subject": "Format Not Recognized",
                "body": json.dumps(data, indent=2) if isinstance(data, (dict, list)) else str(data),
                "sequence_number": 1
            }]
        }]

    return final_output


@router.post("/generate")
async def generate_email_sequences(request: GenerateSequencesRequest):
    """
    Generate personalized email sequences using the Smythos API.
    Proxies the request with optimized prompt parameters.
    """
    settings = get_settings()
    smythos_url = settings.SMYTHOS_API_URL

    if not smythos_url:
        raise HTTPException(
            status_code=500,
            detail="SMYTHOS_API_URL is not configured. Add it to your .env file.",
        )

    # Build the payload for Smythos
    payload = {
        "company": request.company.model_dump(),
        "buyer_personas": [p.model_dump() for p in request.buyer_personas],
        "num_sequences": request.num_sequences,
        "tone": request.tone,
    }

    if request.business_profile:
        payload["business_profile"] = request.business_profile.model_dump()

    logger.info(
        f"Calling Smythos API with {len(request.buyer_personas)} persona(s), "
        f"{request.num_sequences} sequence(s), tone={request.tone}"
    )

    start = time.time()
    try:
        async with httpx.AsyncClient(timeout=300.0) as client:
            response = await client.post(
                smythos_url,
                json=payload,
                headers={"Content-Type": "application/json"},
            )

        elapsed = time.time() - start
        logger.info(f"Smythos response: {response.status_code} ({elapsed:.1f}s)")

        if response.status_code != 200:
            logger.error(f"Smythos error: {response.text[:1000]}")
            # If we got a 4xx or 5xx but there is some text, maybe we can still show it?
            # For now, stick to error if not 200, but log more.
            raise HTTPException(
                status_code=502,
                detail=f"Smythos API returned {response.status_code}: {response.text[:200]}",
            )

        # Robust JSON parsing of the response itself
        try:
            data = response.json()
        except json.JSONDecodeError:
            logger.warning("Smythos response is not valid JSON. Treating as raw text.")
            data = response.text

        logger.info(f"DEBUG: Smythos RAW response type: {type(data)}")
        
        # Normalize the output
        output = normalize_smythos_output(data)

        if not output:
            logger.error(f"Could not extract any valid output from Smythos response: {str(data)[:500]}")
            return {
                "data": [],
                "total_groups": 0,
                "total_emails": 0,
                "elapsed_seconds": round(elapsed, 1),
                "message": "Smythos API returned no recognized sequences. Try adjusting your personas or company profile.",
                "raw_debug": str(data)[:1000] if settings.DEBUG else None
            }

        # Compute summary
        total_emails = sum(len(g.get("emails", [])) for g in output)

        return {
            "data": output,
            "total_groups": len(output),
            "total_emails": total_emails,
            "elapsed_seconds": round(elapsed, 1),
            "message": f"Generated {total_emails} emails across {len(output)} persona group(s)",
            "raw_debug": str(data)[:1000] if settings.DEBUG else None
        }


    except httpx.RequestError as e:
        elapsed = time.time() - start
        logger.error(f"Smythos request failed ({elapsed:.1f}s): {e}")
        raise HTTPException(
            status_code=502,
            detail=f"Failed to connect to Smythos API: {str(e)}",
        )


@router.post("/build-personas")
async def build_personas(leads: List[dict]):
    """
    Auto-generate buyer personas from a list of leads based on their titles.
    """
    personas = build_personas_from_leads(leads)
    return {
        "personas": personas,
        "total": len(personas),
    }
