"""
B2B Email Generation Routes
─────────────────────────────
Generate personalized B2B email sequences and save them to the mailbox for sending.
"""
import json
import logging
import time
import os
import asyncio
from datetime import datetime
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.core.config import get_settings
from app.api.deps import get_supabase
from app.services.b2b_email_generator import generate_b2b_sequence

router = APIRouter()
logger = logging.getLogger(__name__)

# --- Mailbox Helpers ---
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

# --- Request Models ---
class CompanyProfile(BaseModel):
    name: str
    industry: str
    description: str
    what_do_you_sell: str
    who_do_you_sell_to: str
    what_are_the_benefits: str
    website_url: Optional[str] = ""

class BuyerPersona(BaseModel):
    title: str
    role: str
    responsibilities: List[str] = []
    primary_goal: str = ""
    pain_points: List[str] = []
    desired_outcomes: List[str] = []
    problems_we_solve: List[str] = []

class LeadPayload(BaseModel):
    id: str
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    title: Optional[str] = None
    company: Optional[str] = None
    website: Optional[str] = None

class GenerateSequencesRequest(BaseModel):
    company: CompanyProfile
    buyer_personas: List[BuyerPersona]
    num_sequences: int = 3
    tone: str = "professional"
    leads: Optional[List[LeadPayload]] = None

# --- Routes ---

@router.post("/generate")
async def generate_email_sequences(request: GenerateSequencesRequest):
    """
    Generate personalized email sequences and save to the local mailbox for sending.
    """
    logger.info(
        f"Generating sequences for {len(request.buyer_personas)} persona(s), "
        f"{request.num_sequences} step(s), tone={request.tone}"
    )

    start = time.time()
    
    try:
        # 1. Parallel Generation for each persona
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

        all_sequences = await asyncio.gather(*tasks)

        # 2. Format response data
        generated_data = []
        persona_email_map = {} # title -> sequences

        for i, sequences in enumerate(all_sequences):
            persona = request.buyer_personas[i]
            persona_email_map[persona.title] = sequences
            
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

        # 3. Save to Supabase if leads/personas were provided
        mailbox = load_mailbox() # Still load for local preview/sync if needed, but primary is DB
        saved_count = 0
        supabase = get_supabase()
        
        for i, sequences in enumerate(all_sequences):
            persona = request.buyer_personas[i]
            
            if not sequences:
                logger.warning(f"No sequences generated for persona: {persona.title}")
                continue
            
            # A. Save Persona to DB
            persona_data = {
                "title": persona.title,
                "role_category": persona.role,
                "primary_goal": persona.primary_goal,
                "pain_points": persona.pain_points,
                "desired_outcomes": persona.desired_outcomes,
                "problems_we_solve": persona.problems_we_solve,
                "responsibilities": persona.responsibilities
            }
            
            p_res = supabase.schema("b2b").table("buyer_personas").select("id").eq("title", persona.title).execute()
            if p_res.data:
                p_id = p_res.data[0]["id"]
                supabase.schema("b2b").table("buyer_personas").update(persona_data).eq("id", p_id).execute()
            else:
                p_insert = supabase.schema("b2b").table("buyer_personas").insert(persona_data).execute()
                if not p_insert.data:
                    continue
                p_id = p_insert.data[0]["id"]
            
            # B. Save Sequences to DB
            for j, seq in enumerate(sequences):
                seq_data = {
                    "persona_id": p_id,
                    "step_number": j + 1,
                    "subject": seq["subject"],
                    "body": seq["body"],
                    "tone": request.tone
                }
                seq_res = supabase.schema("b2b").table("email_sequences").select("id").eq("persona_id", p_id).eq("step_number", j + 1).execute()
                if seq_res.data:
                    supabase.schema("b2b").table("email_sequences").update(seq_data).eq("id", seq_res.data[0]["id"]).execute()
                else:
                    supabase.schema("b2b").table("email_sequences").insert(seq_data).execute()

            # C. Link Leads to Persona and Save to Mailbox
            if request.leads:
                for lead in request.leads:
                    lead_title = lead.title or "Business Professional"
                    if lead_title != persona.title:
                        continue
                    
                    # Update lead in DB to link to persona
                    supabase.schema("b2b").table("leads").update(
                        {"persona_id": p_id}
                    ).eq("email", lead.email).execute()

                    # Save to outreach.b2b_campaign_leads for the Outreach UI
                    camp_lead_data = {
                        "lead_id": lead.id,
                        "target_email": lead.email,
                        "subject": sequences[0]["subject"],
                        "body": sequences[0]["body"],
                        "status": "draft"
                    }
                    camp_res = supabase.schema("outreach").table("b2b_campaign_leads").select("id").eq("lead_id", lead.id).execute()
                    if camp_res.data:
                        supabase.schema("outreach").table("b2b_campaign_leads").update(camp_lead_data).eq("id", camp_res.data[0]["id"]).execute()
                    else:
                        supabase.schema("outreach").table("b2b_campaign_leads").insert(camp_lead_data).execute()

                    # Also update local mailbox.json for existing UI compatibility
                    email_data = {
                        "business_id": lead.id,
                        "business_name": lead.company or "B2B Lead",
                        "business_url": lead.website or "",
                        "target_email": lead.email,
                        "subject": sequences[0]["subject"],
                        "body": sequences[0]["body"],
                        "status": "draft",
                        "created_at": datetime.now().isoformat(),
                        "type": "b2b",
                        "persona": lead_title,
                        "sequences": sequences,
                        "persona_id": p_id
                    }

                    existing_idx = next((idx for idx, m in enumerate(mailbox) if m.get("business_id") == lead.id), -1)
                    if existing_idx >= 0:
                        mailbox[existing_idx].update(email_data)
                    else:
                        mailbox.append(email_data)
                    saved_count += 1
            
        save_mailbox(mailbox)
        logger.info(f"Saved {saved_count} B2B leads and personas to Supabase")

        elapsed = time.time() - start
        total_emails = sum(len(g["emails"]) for g in generated_data)

        return {
            "data": generated_data,
            "total_groups": len(generated_data),
            "total_emails": total_emails,
            "elapsed_seconds": round(elapsed, 1),
            "message": f"Successfully generated {total_emails} emails and saved {len(request.leads) if request.leads else 0} to mailbox."
        }

    except Exception as e:
        elapsed = time.time() - start
        logger.error(f"B2B Email generation failed after {elapsed:.1f}s: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate email sequences: {str(e)}"
        )

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
        title_lower = title.lower()
        if any(kw in title_lower for kw in ["ceo", "founder", "owner", "president"]):
            role = "Executive Leadership"
        elif any(kw in title_lower for kw in ["cto", "vp eng", "engineering"]):
            role = "Technical Leadership"
        elif any(kw in title_lower for kw in ["cmo", "marketing", "growth"]):
            role = "Marketing Leadership"
        elif any(kw in title_lower for kw in ["sales", "revenue", "commercial"]):
            role = "Sales Leadership"
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

@router.post("/build-personas")
async def build_personas_api(leads: List[dict]):
    """
    Auto-generate buyer personas from a list of leads based on their titles.
    """
    personas = build_personas_from_leads(leads)
    return {
        "personas": personas,
        "total": len(personas),
    }
