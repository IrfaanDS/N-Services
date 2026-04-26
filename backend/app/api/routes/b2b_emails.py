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


import asyncio
from app.services.b2b_email_generator import generate_b2b_sequence

@router.post("/generate")
async def generate_email_sequences(request: GenerateSequencesRequest):
    """
    Generate personalized email sequences using the internal Groq-powered B2B service.
    Uses parallel processing to speed up generation for multiple personas.
    """
    logger.info(
        f"Generating sequences for {len(request.buyer_personas)} persona(s), "
        f"{request.num_sequences} step(s), tone={request.tone}"
    )

    start = time.time()
    
    try:
        # Create a list of async tasks for each persona
        tasks = []
        for persona in request.buyer_personas:
            tasks.append(
                generate_b2b_sequence(
                    company_profile=request.company.model_dump(),
                    persona=persona.model_dump(),
                    num_sequences=request.num_sequences,
                    tone=request.tone
                )
            )

        # Run all tasks in parallel
        all_sequences = await asyncio.gather(*tasks)

        generated_data = []
        for i, sequences in enumerate(all_sequences):
            persona = request.buyer_personas[i]
            
            emails_with_meta = []
            for j, email in enumerate(sequences):
                emails_with_meta.append({
                    "subject": email.get("subject", "(No Subject)"),
                    "body": email.get("body", "(No Body)"),
                    "sequence_number": j + 1
                })

            generated_data.append({
                "persona_title": persona.title,
                "emails": emails_with_meta
            })

        elapsed = time.time() - start
        total_emails = sum(len(g["emails"]) for g in generated_data)

        return {
            "data": generated_data,
            "total_groups": len(generated_data),
            "total_emails": total_emails,
            "elapsed_seconds": round(elapsed, 1),
            "message": f"Successfully generated {total_emails} emails across {len(generated_data)} persona(s)"
        }

    except Exception as e:
        elapsed = time.time() - start
        logger.error(f"B2B Email generation failed after {elapsed:.1f}s: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate email sequences: {str(e)}"
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
