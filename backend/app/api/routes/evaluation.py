"""
Lead Evaluation Routes
─────────────────────────
Score leads using the SEO audit scoring algorithm.
Accepts business IDs (from Lead Acquisition) or user-uploaded CSV.
Matches against seo_audits + business_contacts tables in Supabase.
"""
import io
import csv
import math
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.api.deps import get_supabase

router = APIRouter()


# ─── Request / Response models ───

class EvaluateRequest(BaseModel):
    business_ids: list[str]


class ScoredLead(BaseModel):
    business_id: str
    business_name: Optional[str] = None
    website_url: Optional[str] = None
    niche: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    facebook: Optional[str] = None
    instagram: Optional[str] = None
    linkedin: Optional[str] = None
    lead_score: int = 0
    priority: str = "High"
    reasoning: str = ""


# ─── Scoring algorithm (ported from user's Python script) ───

def _clean(val):
    """Convert NaN / None / empty to None."""
    if val is None:
        return None
    s = str(val).strip()
    if s.lower() in ("nan", "", "none", "null"):
        return None
    return s


def _score_lead(audit: dict, contact: dict) -> tuple[int, str, str]:
    """
    Google-aligned scoring algorithm.
    Returns (lead_score, priority, reasoning).

    Score accumulates points for good SEO practices.
    lead_score = 100 - score  (high lead_score = business needs MORE help = better lead).
    """
    score = 0
    issues = []

    # ── 1. Technical & Performance (30 pts) ──

    # HTTPS (10 pts)
    if audit.get("is_https"):
        score += 10
    else:
        issues.append("no HTTPS (Security Risk)")

    # Page Speed Proxy (10 pts) — script count < 40 as a proxy
    sc = audit.get("script_count", 0) or 0
    if sc < 40:
        score += 10
    else:
        issues.append(f"Potential Speed Issue ({sc} scripts)")

    # ── 2. On-Page SEO (40 pts) ──

    # Title Tag (10 pts)
    if audit.get("title_present"):
        score += 10
    else:
        issues.append("missing Title Tag")

    # H1 Tag (10 pts) — Google prefers exactly one primary H1
    h1 = audit.get("h1_count", 0) or 0
    if h1 == 1:
        score += 10
    else:
        issues.append(f"Improper H1 Structure (count: {h1})")

    # Image Alt Text (10 pts)
    alt_missing = audit.get("missing_alt_text_count", 0) or 0
    if alt_missing == 0:
        score += 10
    else:
        issues.append(f"Missing Alt Text ({alt_missing} images)")

    # Meta Description (10 pts)
    if audit.get("meta_description_present"):
        score += 10
    else:
        issues.append("missing Meta Description (Lower CTR)")

    # ── 3. E-E-A-T & Local Trust Signals (30 pts) ──

    # Schema Markup (10 pts)
    if audit.get("has_schema_markup"):
        score += 10
    else:
        issues.append("no Local Schema Markup")

    # NAP / Contact Info (15 pts)
    contact_pts = 0
    if _clean(contact.get("phone")):
        contact_pts += 7.5
    if _clean(contact.get("email")):
        contact_pts += 7.5
    score += contact_pts
    if contact_pts < 15:
        issues.append("Incomplete Contact/NAP info")

    # Social Profiles (5 pts) — any social presence counts
    has_social = any([
        _clean(contact.get("facebook")),
        _clean(contact.get("instagram")),
        _clean(contact.get("linkedin")),
    ])
    if has_social:
        score += 5
    else:
        issues.append("no Social Entity verification")

    # Lead Score (inversion for pitching)
    lead_score = 100 - score

    # Priority based on pitchability
    if lead_score >= 60:
        priority = "High"
    elif lead_score >= 30:
        priority = "Medium"
    else:
        priority = "Low"

    reasoning = ", ".join(issues) if issues else "Optimized Site"

    return int(lead_score), priority, reasoning


# ─── Helper: fetch and score a batch of business IDs ───

def _fetch_and_score(supabase, business_ids: list[str]) -> list[dict]:
    """
    Given a list of business IDs:
    1. Fetch businesses + contacts from businesses / business_contacts
    2. Fetch seo_audits for those IDs
    3. Run scoring on each
    """
    if not business_ids:
        return []

    # Fetch businesses with contacts
    biz_result = (
        supabase.table("businesses")
        .select("id, business_name, website_url, niche, city, country, "
                "business_contacts(email, phone, linkedin, instagram, facebook)")
        .in_("id", business_ids)
        .execute()
    )
    biz_map = {}
    for row in (biz_result.data or []):
        contacts = row.pop("business_contacts", [])
        contact = contacts[0] if contacts else {}
        biz_map[row["id"]] = {"business": row, "contact": contact}

    # Fetch seo_audits
    audit_result = (
        supabase.table("seo_audits")
        .select("*")
        .in_("business_id", business_ids)
        .execute()
    )
    audit_map = {}
    for row in (audit_result.data or []):
        audit_map[row["business_id"]] = row

    # Score each lead
    scored = []
    for bid in business_ids:
        biz_data = biz_map.get(bid)
        if not biz_data:
            continue

        biz = biz_data["business"]
        contact = biz_data["contact"]
        audit = audit_map.get(bid, {})

        lead_score, priority, reasoning = _score_lead(audit, contact)

        scored.append({
            "business_id": bid,
            "business_name": _clean(biz.get("business_name")),
            "website_url": _clean(biz.get("website_url")),
            "niche": _clean(biz.get("niche")),
            "city": _clean(biz.get("city")),
            "country": _clean(biz.get("country")),
            "email": _clean(contact.get("email")),
            "phone": _clean(contact.get("phone")),
            "facebook": _clean(contact.get("facebook")),
            "instagram": _clean(contact.get("instagram")),
            "linkedin": _clean(contact.get("linkedin")),
            "lead_score": lead_score,
            "priority": priority,
            "reasoning": reasoning,
        })

    return scored


# ─── Routes ───

@router.post("/")
async def evaluate_leads(body: EvaluateRequest, supabase=Depends(get_supabase)):
    """
    Evaluate a list of business IDs.
    Fetches seo_audits + contacts, runs scoring, returns results.
    """
    scored = _fetch_and_score(supabase, body.business_ids)

    # Compute summary stats
    scores = [s["lead_score"] for s in scored]
    avg_score = round(sum(scores) / len(scores), 1) if scores else 0
    high_count = sum(1 for s in scored if s["priority"] == "High")
    low_count = sum(1 for s in scored if s["priority"] == "Low")

    return {
        "data": scored,
        "total": len(scored),
        "avg_score": avg_score,
        "high_potential": high_count,
        "low_potential": low_count,
    }


@router.post("/upload")
async def evaluate_uploaded_csv(file: UploadFile = File(...), supabase=Depends(get_supabase)):
    """
    Accept a user-uploaded CSV. Must have either 'business_id' or 'website_url' column.
    Matches against the database, runs scoring, returns results.
    """
    content = await file.read()
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    rows = list(reader)

    if not rows:
        raise HTTPException(400, "CSV file is empty")

    headers = [h.strip().lower() for h in rows[0].keys()]

    # Try to find business IDs
    business_ids = []

    if "business_id" in headers:
        business_ids = [r.get("business_id", "").strip() for r in rows if r.get("business_id", "").strip()]
    elif "website_url" in headers or "website" in headers:
        # Look up by website URL
        url_key = "website_url" if "website_url" in headers else "website"
        urls = [r.get(url_key, "").strip() for r in rows if r.get(url_key, "").strip()]
        if urls:
            biz_result = (
                supabase.table("businesses")
                .select("id, website_url")
                .execute()
            )
            url_to_id = {}
            for biz in (biz_result.data or []):
                cleaned = (biz.get("website_url") or "").strip().lower().rstrip("/")
                url_to_id[cleaned] = biz["id"]

            for url in urls:
                normalized = url.lower().strip().rstrip("/")
                if normalized in url_to_id:
                    business_ids.append(url_to_id[normalized])
                # Also try with/without http/https/www
                for prefix in ["", "http://", "https://", "http://www.", "https://www."]:
                    candidate = prefix + normalized.replace("http://", "").replace("https://", "").replace("www.", "")
                    if candidate in url_to_id:
                        business_ids.append(url_to_id[candidate])
                        break
    else:
        raise HTTPException(400, "CSV must contain 'business_id' or 'website_url' column")

    if not business_ids:
        raise HTTPException(400, "No matching businesses found in the database for the uploaded CSV")

    # Deduplicate
    business_ids = list(dict.fromkeys(business_ids))

    scored = _fetch_and_score(supabase, business_ids)

    scores = [s["lead_score"] for s in scored]
    avg_score = round(sum(scores) / len(scores), 1) if scores else 0
    high_count = sum(1 for s in scored if s["priority"] == "High")
    low_count = sum(1 for s in scored if s["priority"] == "Low")

    return {
        "data": scored,
        "total": len(scored),
        "avg_score": avg_score,
        "high_potential": high_count,
        "low_potential": low_count,
    }
