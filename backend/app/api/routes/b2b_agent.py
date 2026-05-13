"""
B2B Agent Mode — Automated Pipeline with Live Reasoning
────────────────────────────────────────────────────────
SSE streaming endpoint that orchestrates the full B2B outreach pipeline:
Lead Extraction → Evaluation → Persona Building → Email Generation → Campaign Setup
"""
import io
import csv
import uuid
import json
import time
import base64
import logging
import asyncio
from datetime import datetime
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.core.config import get_settings
from app.api.deps import get_supabase
from app.api.routes.b2b_leads import _normalize_column, _score_b2b_lead, _clean, B2BLead
from app.api.routes.b2b_emails import build_personas_from_leads
from app.services.b2b_email_generator import generate_b2b_sequence

router = APIRouter()
logger = logging.getLogger(__name__)

# ── Global interrupt flag (per-session in production, simple flag for now) ──
_interrupt_flag = False

DEMO_EMAIL = "hifsashafique04@gmail.com"

# ── Demo leads for showcase ──
DEMO_LEADS = [
    {"first_name": "Sarah", "last_name": "Chen", "name": "Sarah Chen", "email": DEMO_EMAIL,
     "title": "CEO", "company": "TechNova Inc", "website": "technova.io",
     "linkedin": "https://linkedin.com/in/sarahchen", "country": "United States", "city": "San Francisco",
     "industry": "Technology", "employees": "51-200"},
    {"first_name": "Michael", "last_name": "Rodriguez", "name": "Michael Rodriguez", "email": DEMO_EMAIL,
     "title": "VP of Engineering", "company": "DataStream Corp", "website": "datastream.co",
     "linkedin": "https://linkedin.com/in/mrodriguez", "country": "United States", "city": "Austin",
     "industry": "Technology", "employees": "201-500"},
    {"first_name": "Emily", "last_name": "Thompson", "name": "Emily Thompson", "email": DEMO_EMAIL,
     "title": "Marketing Director", "company": "GrowthPulse Ltd", "website": "growthpulse.com",
     "linkedin": "https://linkedin.com/in/ethompson", "country": "Canada", "city": "Toronto",
     "industry": "Marketing", "employees": "11-50"},
    {"first_name": "James", "last_name": "Park", "name": "James Park", "email": DEMO_EMAIL,
     "title": "CTO", "company": "CloudMatrix Solutions", "website": "cloudmatrix.dev",
     "linkedin": "https://linkedin.com/in/jamespark", "country": "United States", "city": "Seattle",
     "industry": "Technology", "employees": "51-200"},
    {"first_name": "Aisha", "last_name": "Patel", "name": "Aisha Patel", "email": DEMO_EMAIL,
     "title": "Head of Sales", "company": "RevenueFlow AI", "website": "revenueflow.ai",
     "linkedin": "https://linkedin.com/in/aishapatel", "country": "United Kingdom", "city": "London",
     "industry": "Finance", "employees": "11-50"},
]


class AgentRunRequest(BaseModel):
    company_name: str
    company_description: str
    industry: str = "Technology"
    location: str = "United States"
    team_size: str = "51-200 employees"
    tone: str = "professional"
    num_sequences: int = 3
    max_emails: int = 50
    leads_csv_base64: Optional[str] = None
    use_existing_leads: bool = False
    demo_mode: bool = False


def _sse_event(data: dict) -> str:
    """Format a dict as an SSE data line."""
    return f"data: {json.dumps(data)}\n\n"


async def _run_pipeline(request: AgentRunRequest):
    """
    Generator that yields SSE events as it runs through the pipeline.
    """
    global _interrupt_flag
    _interrupt_flag = False
    
    pipeline_start = time.time()
    all_leads = []
    scored_leads = []
    personas = []
    generated_sequences = {}
    
    company_profile = {
        "name": request.company_name,
        "what_do_you_sell": request.company_description,
        "what_are_the_benefits": f"Industry-leading solutions for {request.industry}",
    }

    # ════════════════════════════════════════════════
    # STEP 1: Lead Extraction
    # ════════════════════════════════════════════════
    yield _sse_event({
        "type": "step_start", "step": 1, "name": "Lead Extraction",
        "message": "Initializing lead extraction pipeline..."
    })
    await asyncio.sleep(0.5)

    if _interrupt_flag:
        yield _sse_event({"type": "interrupted", "step": 1, "redirect": "/b2b/leads"})
        return

    if request.demo_mode:
        yield _sse_event({
            "type": "reasoning", "step": 1,
            "message": "🧪 Demo mode activated — using synthetic lead database"
        })
        await asyncio.sleep(0.8)
        
        yield _sse_event({
            "type": "reasoning", "step": 1,
            "message": f"Loading {len(DEMO_LEADS)} demo leads from internal dataset..."
        })
        await asyncio.sleep(0.6)
        
        all_leads = [dict(lead, id=str(uuid.uuid4())) for lead in DEMO_LEADS]
        
        for lead in all_leads:
            yield _sse_event({
                "type": "reasoning", "step": 1,
                "message": f"  → {lead['name']} | {lead['title']} at {lead['company']} ({lead['city']}, {lead['country']})"
            })
            await asyncio.sleep(0.3)

        yield _sse_event({
            "type": "reasoning", "step": 1,
            "message": f"📧 Demo mode: All emails will be sent to {DEMO_EMAIL}"
        })
        await asyncio.sleep(0.4)

    elif request.leads_csv_base64:
        yield _sse_event({
            "type": "reasoning", "step": 1,
            "message": "Decoding uploaded CSV file from base64..."
        })
        await asyncio.sleep(0.3)

        try:
            csv_bytes = base64.b64decode(request.leads_csv_base64)
            text = None
            for encoding in ["utf-8-sig", "utf-8", "latin-1"]:
                try:
                    text = csv_bytes.decode(encoding)
                    break
                except UnicodeDecodeError:
                    continue

            if not text:
                yield _sse_event({"type": "error", "step": 1, "message": "Failed to decode CSV file encoding."})
                return

            yield _sse_event({
                "type": "reasoning", "step": 1,
                "message": f"CSV decoded successfully ({len(csv_bytes)} bytes). Parsing rows..."
            })
            await asyncio.sleep(0.4)

            reader = csv.DictReader(io.StringIO(text))
            rows = list(reader)
            
            if not rows:
                yield _sse_event({"type": "error", "step": 1, "message": "CSV file is empty — no rows found."})
                return

            columns = list(rows[0].keys())
            yield _sse_event({
                "type": "reasoning", "step": 1,
                "message": f"Detected {len(columns)} columns: {', '.join(columns[:8])}{'...' if len(columns) > 8 else ''}"
            })
            await asyncio.sleep(0.3)

            yield _sse_event({
                "type": "reasoning", "step": 1,
                "message": "Normalizing column names to standard schema (Apollo / LinkedIn compatible)..."
            })
            await asyncio.sleep(0.3)

            for row in rows:
                normalized = {}
                for col, val in row.items():
                    field = _normalize_column(col)
                    if field in B2BLead.model_fields:
                        normalized[field] = _clean(val)
                
                if not normalized.get("name"):
                    first = normalized.get("first_name", "") or ""
                    last = normalized.get("last_name", "") or ""
                    full = f"{first} {last}".strip()
                    if full:
                        normalized["name"] = full

                normalized["id"] = str(uuid.uuid4())

                if normalized.get("name") or normalized.get("email"):
                    all_leads.append(normalized)

            yield _sse_event({
                "type": "reasoning", "step": 1,
                "message": f"✓ Successfully parsed {len(all_leads)} valid leads from {len(rows)} total rows"
            })
            await asyncio.sleep(0.3)

        except Exception as e:
            yield _sse_event({"type": "error", "step": 1, "message": f"CSV parsing failed: {str(e)}"})
            return

    elif request.use_existing_leads:
        yield _sse_event({
            "type": "reasoning", "step": 1,
            "message": "Fetching existing leads from Supabase database..."
        })
        await asyncio.sleep(0.4)

        try:
            supabase = get_supabase()
            res = supabase.schema("b2b").table("leads").select("*").limit(request.max_emails).execute()
            db_leads = res.data or []
            
            for lead in db_leads:
                all_leads.append({
                    "id": lead["id"],
                    "first_name": lead.get("first_name"),
                    "last_name": lead.get("last_name"),
                    "name": lead.get("full_name"),
                    "title": lead.get("title"),
                    "email": lead.get("email"),
                    "linkedin": lead.get("linkedin_url"),
                    "city": lead.get("city"),
                    "country": lead.get("country"),
                    "lead_score": lead.get("lead_score", 0),
                    "priority": lead.get("priority", "Medium"),
                })
            
            yield _sse_event({
                "type": "reasoning", "step": 1,
                "message": f"✓ Loaded {len(all_leads)} leads from database"
            })
            await asyncio.sleep(0.3)

        except Exception as e:
            yield _sse_event({"type": "error", "step": 1, "message": f"Database fetch failed: {str(e)}"})
            return
    else:
        yield _sse_event({"type": "error", "step": 1, "message": "No lead source provided. Upload a CSV or enable existing leads."})
        return

    if not all_leads:
        yield _sse_event({"type": "error", "step": 1, "message": "No valid leads found in the provided data."})
        return

    yield _sse_event({
        "type": "step_complete", "step": 1, "name": "Lead Extraction",
        "result": {"total_leads": len(all_leads)}
    })
    await asyncio.sleep(0.5)

    # ════════════════════════════════════════════════
    # STEP 2: Lead Evaluation & Scoring
    # ════════════════════════════════════════════════
    if _interrupt_flag:
        yield _sse_event({"type": "interrupted", "step": 2, "redirect": "/b2b/evaluation"})
        return

    yield _sse_event({
        "type": "step_start", "step": 2, "name": "Lead Evaluation",
        "message": "Scoring leads based on data completeness and title seniority..."
    })
    await asyncio.sleep(0.5)

    yield _sse_event({
        "type": "reasoning", "step": 2,
        "message": "Scoring criteria: Email (+25), Title Seniority (+20/+10/+5), LinkedIn (+15), Company (+15), Phone (+10), Location (+10), Social (+5)"
    })
    await asyncio.sleep(0.5)

    for i, lead in enumerate(all_leads):
        score, priority, reasoning = _score_b2b_lead(lead)
        lead["lead_score"] = score
        lead["priority"] = priority
        lead["reasoning"] = reasoning
        scored_leads.append(lead)

        if i < 5 or (i + 1) == len(all_leads):
            yield _sse_event({
                "type": "reasoning", "step": 2,
                "message": f"  [{i+1}/{len(all_leads)}] {lead.get('name', 'Unknown')} ({lead.get('title', 'N/A')}) → Score: {score}/100 [{priority}]"
            })
            await asyncio.sleep(0.15)
        elif i == 5:
            yield _sse_event({
                "type": "reasoning", "step": 2,
                "message": f"  ... scoring remaining {len(all_leads) - 5} leads ..."
            })
            await asyncio.sleep(0.2)

    # Sort by score and cap at max_emails
    scored_leads.sort(key=lambda x: x["lead_score"], reverse=True)
    if len(scored_leads) > request.max_emails:
        yield _sse_event({
            "type": "reasoning", "step": 2,
            "message": f"Capping to top {request.max_emails} leads (from {len(scored_leads)} total) based on score"
        })
        scored_leads = scored_leads[:request.max_emails]
        await asyncio.sleep(0.3)

    scores = [s["lead_score"] for s in scored_leads]
    avg_score = round(sum(scores) / len(scores), 1) if scores else 0
    high = sum(1 for s in scored_leads if s["priority"] == "High")
    med = sum(1 for s in scored_leads if s["priority"] == "Medium")
    low = sum(1 for s in scored_leads if s["priority"] == "Low")

    yield _sse_event({
        "type": "reasoning", "step": 2,
        "message": f"✓ Scoring complete — Avg: {avg_score}/100 | High: {high} | Medium: {med} | Low: {low}"
    })
    await asyncio.sleep(0.3)

    yield _sse_event({
        "type": "step_complete", "step": 2, "name": "Lead Evaluation",
        "result": {"total_scored": len(scored_leads), "avg_score": avg_score, "high": high, "medium": med, "low": low}
    })
    await asyncio.sleep(0.5)

    # ════════════════════════════════════════════════
    # STEP 3: Audience & Persona Building
    # ════════════════════════════════════════════════
    if _interrupt_flag:
        yield _sse_event({"type": "interrupted", "step": 3, "redirect": "/b2b/evaluation"})
        return

    yield _sse_event({
        "type": "step_start", "step": 3, "name": "Audience & Personas",
        "message": "Building buyer personas from lead job titles..."
    })
    await asyncio.sleep(0.5)

    yield _sse_event({
        "type": "reasoning", "step": 3,
        "message": "Analyzing job titles to group leads by buyer persona..."
    })
    await asyncio.sleep(0.4)

    personas = build_personas_from_leads(scored_leads)

    for p in personas:
        matching = [l for l in scored_leads if (l.get("title") or "Business Professional").strip() == p["title"]]
        yield _sse_event({
            "type": "reasoning", "step": 3,
            "message": f"  → Persona: \"{p['title']}\" ({p['role']}) — {len(matching)} leads matched"
        })
        await asyncio.sleep(0.25)

    yield _sse_event({
        "type": "reasoning", "step": 3,
        "message": f"✓ Created {len(personas)} buyer personas with tailored messaging strategies"
    })
    await asyncio.sleep(0.3)

    yield _sse_event({
        "type": "step_complete", "step": 3, "name": "Audience & Personas",
        "result": {"total_personas": len(personas), "persona_names": [p["title"] for p in personas]}
    })
    await asyncio.sleep(0.5)

    # ════════════════════════════════════════════════
    # STEP 4: Email Generation (via Groq AI)
    # ════════════════════════════════════════════════
    if _interrupt_flag:
        yield _sse_event({"type": "interrupted", "step": 4, "redirect": "/b2b/email-generation"})
        return

    yield _sse_event({
        "type": "step_start", "step": 4, "name": "Email Generation",
        "message": f"Generating {request.num_sequences}-step email sequences via AI (tone: {request.tone})..."
    })
    await asyncio.sleep(0.5)

    yield _sse_event({
        "type": "reasoning", "step": 4,
        "message": f"Using Groq LLM (llama-3.1-8b-instant) to generate personalized copy for {len(personas)} persona group(s)..."
    })
    await asyncio.sleep(0.4)

    total_emails_generated = 0
    for i, persona in enumerate(personas):
        if _interrupt_flag:
            yield _sse_event({"type": "interrupted", "step": 4, "redirect": "/b2b/email-generation"})
            return

        yield _sse_event({
            "type": "reasoning", "step": 4,
            "message": f"  Generating sequence for persona [{i+1}/{len(personas)}]: \"{persona['title']}\"..."
        })
        await asyncio.sleep(0.3)

        try:
            sequences = await generate_b2b_sequence(
                company_profile=company_profile,
                persona=persona,
                num_sequences=request.num_sequences,
                tone=request.tone
            )
            generated_sequences[persona["title"]] = sequences
            total_emails_generated += len(sequences)

            for j, seq in enumerate(sequences):
                yield _sse_event({
                    "type": "reasoning", "step": 4,
                    "message": f"    Step {j+1}: \"{seq.get('subject', '(No Subject)')[:60]}...\""
                })
                await asyncio.sleep(0.15)

            yield _sse_event({
                "type": "reasoning", "step": 4,
                "message": f"  ✓ Generated {len(sequences)} emails for \"{persona['title']}\""
            })
            await asyncio.sleep(0.2)

        except Exception as e:
            yield _sse_event({
                "type": "reasoning", "step": 4,
                "message": f"  ⚠ Failed for \"{persona['title']}\": {str(e)} — skipping..."
            })
            generated_sequences[persona["title"]] = []
            await asyncio.sleep(0.3)

    yield _sse_event({
        "type": "reasoning", "step": 4,
        "message": f"✓ AI generation complete — {total_emails_generated} unique email templates created"
    })
    await asyncio.sleep(0.3)

    yield _sse_event({
        "type": "step_complete", "step": 4, "name": "Email Generation",
        "result": {"total_templates": total_emails_generated, "personas_with_emails": len([v for v in generated_sequences.values() if v])}
    })
    await asyncio.sleep(0.5)

    # ════════════════════════════════════════════════
    # STEP 5: Campaign Setup & Saving
    # ════════════════════════════════════════════════
    if _interrupt_flag:
        yield _sse_event({"type": "interrupted", "step": 5, "redirect": "/b2b/outreach"})
        return

    yield _sse_event({
        "type": "step_start", "step": 5, "name": "Campaign Setup",
        "message": "Saving leads, personas, and email sequences to database..."
    })
    await asyncio.sleep(0.5)

    saved_to_outreach = 0
    sending_account_id = None

    try:
        supabase = get_supabase()

        # Auto-connect first sending account
        yield _sse_event({
            "type": "reasoning", "step": 5,
            "message": "Looking for available sending accounts..."
        })
        await asyncio.sleep(0.3)

        acc_res = supabase.schema("outreach").table("b2b_sending_accounts").select("id, name, smtp_user").limit(1).execute()
        if acc_res.data:
            sending_account_id = acc_res.data[0]["id"]
            yield _sse_event({
                "type": "reasoning", "step": 5,
                "message": f"  ✓ Auto-connected to sending domain: {acc_res.data[0]['name']} ({acc_res.data[0]['smtp_user']})"
            })
        else:
            yield _sse_event({
                "type": "reasoning", "step": 5,
                "message": "  ⚠ No sending accounts found — you'll need to configure one before sending"
            })
        await asyncio.sleep(0.3)

        # Save personas to DB
        yield _sse_event({
            "type": "reasoning", "step": 5,
            "message": "Saving buyer personas to database..."
        })
        await asyncio.sleep(0.3)

        persona_id_map = {}
        for persona in personas:
            persona_data = {
                "title": persona["title"],
                "role_category": persona["role"],
                "primary_goal": persona.get("primary_goal", ""),
                "pain_points": persona.get("pain_points", []),
                "desired_outcomes": persona.get("desired_outcomes", []),
                "problems_we_solve": persona.get("problems_we_solve", []),
                "responsibilities": persona.get("responsibilities", []),
            }
            p_res = supabase.schema("b2b").table("buyer_personas").select("id").eq("title", persona["title"]).execute()
            if p_res.data:
                p_id = p_res.data[0]["id"]
                supabase.schema("b2b").table("buyer_personas").update(persona_data).eq("id", p_id).execute()
            else:
                p_insert = supabase.schema("b2b").table("buyer_personas").insert(persona_data).execute()
                p_id = p_insert.data[0]["id"] if p_insert.data else None
            
            if p_id:
                persona_id_map[persona["title"]] = p_id

                # Save sequences
                sequences = generated_sequences.get(persona["title"], [])
                for j, seq in enumerate(sequences):
                    seq_data = {
                        "persona_id": p_id,
                        "step_number": j + 1,
                        "subject": seq.get("subject", ""),
                        "body": seq.get("body", ""),
                        "tone": request.tone,
                    }
                    existing = supabase.schema("b2b").table("email_sequences").select("id").eq("persona_id", p_id).eq("step_number", j + 1).execute()
                    if existing.data:
                        supabase.schema("b2b").table("email_sequences").update(seq_data).eq("id", existing.data[0]["id"]).execute()
                    else:
                        supabase.schema("b2b").table("email_sequences").insert(seq_data).execute()

        yield _sse_event({
            "type": "reasoning", "step": 5,
            "message": f"  ✓ Saved {len(persona_id_map)} personas and {total_emails_generated} email templates"
        })
        await asyncio.sleep(0.3)

        # Save leads to DB first (common.businesses → b2b.companies → b2b.leads)
        yield _sse_event({
            "type": "reasoning", "step": 5,
            "message": f"Saving {len(scored_leads)} leads to database..."
        })
        await asyncio.sleep(0.3)

        lead_db_ids = {}  # map local id -> db lead id
        for lead in scored_leads:
            try:
                website = _clean(lead.get("website")) or f"{(lead.get('company') or 'unknown').lower().replace(' ', '')}.com"
                
                # 1. Upsert common.businesses
                biz_data = {
                    "name": _clean(lead.get("company")) or "Unknown Company",
                    "website_url": website,
                    "niche": _clean(lead.get("industry")),
                    "city": _clean(lead.get("city")),
                    "country": _clean(lead.get("country")),
                    "source": "b2b_agent"
                }
                biz_res = supabase.schema("common").table("businesses").upsert(
                    biz_data, on_conflict="website_url"
                ).execute()
                if not biz_res.data:
                    continue
                biz_id = biz_res.data[0]["id"]

                # 2. Upsert b2b.companies
                comp_data = {
                    "business_id": biz_id,
                    "industry": _clean(lead.get("industry")),
                    "employee_count": _clean(lead.get("employees")),
                    "website_domain": website.replace("https://", "").replace("http://", "").split("/")[0],
                    "csv_source_file": "agent_mode"
                }
                comp_res = supabase.schema("b2b").table("companies").upsert(
                    comp_data, on_conflict="business_id"
                ).execute()
                if not comp_res.data:
                    continue
                comp_id = comp_res.data[0]["id"]

                # 3. Upsert b2b.leads
                lead_title = (lead.get("title") or "Business Professional").strip()
                persona_id = persona_id_map.get(lead_title)
                lead_data = {
                    "id": lead["id"],
                    "company_id": comp_id,
                    "business_id": biz_id,
                    "first_name": _clean(lead.get("first_name")),
                    "last_name": _clean(lead.get("last_name")),
                    "full_name": _clean(lead.get("name")),
                    "title": _clean(lead.get("title")),
                    "email": _clean(lead.get("email")),
                    "linkedin_url": _clean(lead.get("linkedin")),
                    "city": _clean(lead.get("city")),
                    "country": _clean(lead.get("country")),
                    "lead_score": lead.get("lead_score", 0),
                    "priority": lead.get("priority", "Medium"),
                    "scoring_reason": lead.get("reasoning"),
                    "persona_id": persona_id,
                    "status": "new"
                }
                # Try insert, if exists update
                try:
                    supabase.schema("b2b").table("leads").insert(lead_data).execute()
                except Exception:
                    supabase.schema("b2b").table("leads").update(lead_data).eq("id", lead["id"]).execute()
                
                lead_db_ids[lead["id"]] = True
            except Exception as e:
                logger.warning(f"Failed to save lead {lead.get('name')}: {e}")

        yield _sse_event({
            "type": "reasoning", "step": 5,
            "message": f"  ✓ {len(lead_db_ids)} leads saved to database"
        })
        await asyncio.sleep(0.3)

        # Now save to outreach queue
        yield _sse_event({
            "type": "reasoning", "step": 5,
            "message": f"Queueing leads for outreach campaign..."
        })
        await asyncio.sleep(0.3)

        for lead in scored_leads:
            if lead["id"] not in lead_db_ids:
                continue

            lead_title = (lead.get("title") or "Business Professional").strip()
            persona_id = persona_id_map.get(lead_title)
            sequences = generated_sequences.get(lead_title, [])

            if not sequences:
                continue

            target_email = DEMO_EMAIL if request.demo_mode else lead.get("email")
            if not target_email:
                continue

            cl_data = {
                "lead_id": lead["id"],
                "persona_id": persona_id,
                "target_email": target_email,
                "subject": sequences[0].get("subject", ""),
                "body": sequences[0].get("body", ""),
                "status": "draft",
            }

            try:
                existing = supabase.schema("outreach").table("b2b_campaign_leads").select("id").eq("lead_id", lead["id"]).execute()
                if existing.data:
                    supabase.schema("outreach").table("b2b_campaign_leads").update(cl_data).eq("id", existing.data[0]["id"]).execute()
                else:
                    supabase.schema("outreach").table("b2b_campaign_leads").insert(cl_data).execute()
                saved_to_outreach += 1
            except Exception as e:
                logger.warning(f"Failed to queue lead {lead.get('name')}: {e}")

        yield _sse_event({
            "type": "reasoning", "step": 5,
            "message": f"  ✓ {saved_to_outreach} leads queued in outreach mailbox as drafts"
        })
        await asyncio.sleep(0.3)

    except Exception as e:
        yield _sse_event({
            "type": "reasoning", "step": 5,
            "message": f"  ⚠ Database save encountered errors: {str(e)}"
        })
        logger.error(f"Agent pipeline DB error: {e}")
        await asyncio.sleep(0.3)

    yield _sse_event({
        "type": "reasoning", "step": 5,
        "message": "✓ Campaign setup complete — all leads are in DRAFT status awaiting your approval"
    })
    await asyncio.sleep(0.3)

    yield _sse_event({
        "type": "step_complete", "step": 5, "name": "Campaign Setup",
        "result": {"saved_to_outreach": saved_to_outreach, "sending_account_id": sending_account_id}
    })
    await asyncio.sleep(0.3)

    # ════════════════════════════════════════════════
    # PIPELINE COMPLETE
    # ════════════════════════════════════════════════
    elapsed = round(time.time() - pipeline_start, 1)

    yield _sse_event({
        "type": "pipeline_complete",
        "summary": {
            "total_leads_processed": len(scored_leads),
            "total_personas": len(personas),
            "total_emails_generated": total_emails_generated,
            "leads_queued": saved_to_outreach,
            "avg_score": avg_score,
            "high_priority": high,
            "medium_priority": med,
            "low_priority": low,
            "sending_account_id": sending_account_id,
            "elapsed_seconds": elapsed,
            "demo_mode": request.demo_mode,
        }
    })


@router.post("/run")
async def run_agent(request: AgentRunRequest):
    """
    Run the full B2B agent pipeline and stream results via SSE.
    """
    async def event_stream():
        async for event in _run_pipeline(request):
            yield event

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@router.post("/interrupt")
async def interrupt_agent():
    """Set the interrupt flag to pause the running pipeline."""
    global _interrupt_flag
    _interrupt_flag = True
    return {"status": "interrupted", "message": "Agent pipeline will pause at the next step."}
