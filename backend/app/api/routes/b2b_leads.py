"""
B2B Lead Acquisition & Evaluation Routes
─────────────────────────────────────────
Upload Apollo CSV exports, parse leads, and score them
based on data completeness and title seniority.
"""
import io
import csv
import uuid
import logging
import json
from typing import Optional, List
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from groq import Groq
from app.core.config import get_settings

router = APIRouter()
logger = logging.getLogger(__name__)


# ─── Request / Response models ───

class B2BLead(BaseModel):
    id: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    name: Optional[str] = None
    title: Optional[str] = None
    company: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    linkedin: Optional[str] = None
    twitter: Optional[str] = None
    facebook: Optional[str] = None
    instagram: Optional[str] = None
    industry: Optional[str] = None
    niche: Optional[str] = None
    employees: Optional[str] = None
    website: Optional[str] = None


class B2BEvaluateRequest(BaseModel):
    leads: List[dict]


class B2BAudienceRequest(BaseModel):
    business_description: str


# ─── Seniority keywords for scoring ───

SENIOR_TITLES = [
    "ceo", "cto", "cfo", "coo", "cio", "cmo", "cpo", "cro",
    "chief", "president", "founder", "co-founder", "owner",
    "vp", "vice president", "svp", "evp",
    "director", "head of", "general manager",
]

MID_TITLES = [
    "manager", "lead", "senior", "principal", "supervisor",
    "team lead", "coordinator",
]


def _clean(val):
    """Convert NaN / None / empty to None."""
    if val is None:
        return None
    s = str(val).strip()
    if s.lower() in ("nan", "", "none", "null", "n/a", "na"):
        return None
    return s


def _normalize_column(col: str) -> str:
    """Normalize Apollo CSV column names to our standard field names."""
    col = col.strip().lower().replace(" ", "_")

    mappings = {
        "first_name": "first_name",
        "last_name": "last_name",
        "name": "name",
        "full_name": "name",
        "person_name": "name",
        "title": "title",
        "job_title": "title",
        "position": "title",
        "company": "company",
        "company_name": "company",
        "organization": "company",
        "organization_name": "company",
        "email": "email",
        "email_address": "email",
        "work_email": "email",
        "phone": "phone",
        "phone_number": "phone",
        "work_phone": "phone",
        "mobile_phone": "phone",
        "direct_phone": "phone",
        "country": "country",
        "person_country": "country",
        "company_country": "country",
        "city": "city",
        "person_city": "city",
        "company_city": "city",
        "state": "state",
        "person_state": "state",
        "company_state": "state",
        "linkedin_url": "linkedin",
        "linkedin": "linkedin",
        "linkedin_profile": "linkedin",
        "person_linkedin_url": "linkedin",
        "twitter_url": "twitter",
        "twitter": "twitter",
        "facebook_url": "facebook",
        "facebook": "facebook",
        "instagram_url": "instagram",
        "instagram": "instagram",
        "industry": "industry",
        "company_industry": "industry",
        "niche": "niche",
        "category": "niche",
        "vertical": "niche",
        "#_employees": "employees",
        "employees": "employees",
        "number_of_employees": "employees",
        "company_size": "employees",
        "website": "website",
        "company_website": "website",
        "website_url": "website",
        "company_domain": "website",
    }

    return mappings.get(col, col)


def _score_b2b_lead(lead: dict) -> tuple:
    """
    Score a B2B lead based on data completeness and title seniority.
    Returns (score, priority, reasoning).

    Scoring breakdown (0-100):
    - Email present: +25
    - Title seniority: +20 (senior) / +10 (mid) / +5 (other)
    - LinkedIn profile: +15
    - Company present: +15
    - Phone number: +10
    - Country/Location: +10
    - Facebook/Twitter: +5
    """
    score = 0
    issues = []

    # Email (most critical)
    if _clean(lead.get("email")):
        score += 25
    else:
        issues.append("No email address")

    # Title seniority
    title = (_clean(lead.get("title")) or "").lower()
    if title:
        if any(kw in title for kw in SENIOR_TITLES):
            score += 20
        elif any(kw in title for kw in MID_TITLES):
            score += 10
        else:
            score += 5
    else:
        issues.append("No job title")

    # LinkedIn
    if _clean(lead.get("linkedin")):
        score += 15
    else:
        issues.append("No LinkedIn profile")

    # Company
    if _clean(lead.get("company")):
        score += 15
    else:
        issues.append("No company info")

    # Phone
    if _clean(lead.get("phone")):
        score += 10
    else:
        issues.append("No phone number")

    # Location
    if _clean(lead.get("country")) or _clean(lead.get("city")):
        score += 10
    else:
        issues.append("No location data")

    # Social presence
    if _clean(lead.get("facebook")) or _clean(lead.get("twitter")):
        score += 5
    else:
        issues.append("No social profiles")

    # Priority
    if score >= 70:
        priority = "High"
    elif score >= 40:
        priority = "Medium"
    else:
        priority = "Low"

    reasoning = ", ".join(issues) if issues else "Complete lead profile"

    return score, priority, reasoning


# ─── Routes ───

@router.post("/generate-audience")
async def generate_audience(body: B2BAudienceRequest):
    """
    Generate target audience criteria using AI based on business description.
    """
    settings = get_settings()
    if not settings.GROQ_API_KEY:
        raise HTTPException(500, "GROQ_API_KEY not configured")

    client = Groq(api_key=settings.GROQ_API_KEY)
    
    prompt = f"""
You are an expert B2B Lead Generation Strategist. Based on the following business description, generate target audience criteria for lead sourcing.

Business Description:
{body.business_description}

Return ONLY valid JSON in the exact following format, without markdown formatting:
{{
    "company_attributes": {{
        "industries_include": ["Industry 1", "Industry 2"],
        "company_sizes": ["11-50 employees", "51-200 employees"]
    }},
    "job_title_attributes": {{
        "seniority": ["C-Suite", "VP", "Director"],
        "job_functions": ["Engineering", "IT"]
    }},
    "location_attributes": {{
        "countries_include": ["United States", "Canada"]
    }}
}}
"""

    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            response_format={"type": "json_object"}
        )
        response_content = completion.choices[0].message.content
        return json.loads(response_content)
    except Exception as e:
        logger.error(f"Failed to generate audience: {str(e)}")
        raise HTTPException(500, f"Failed to generate audience: {str(e)}")


@router.post("/upload")
async def upload_b2b_csv(file: UploadFile = File(...)):
    """
    Upload an Apollo CSV export. Parses and normalizes columns,
    returns structured lead data.
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(400, "Only CSV files are accepted")

    content = await file.read()

    # Try different encodings
    for encoding in ["utf-8-sig", "utf-8", "latin-1"]:
        try:
            text = content.decode(encoding)
            break
        except UnicodeDecodeError:
            continue
    else:
        raise HTTPException(400, "Could not decode CSV file")

    reader = csv.DictReader(io.StringIO(text))
    rows = list(reader)

    if not rows:
        raise HTTPException(400, "CSV file is empty")

    # Normalize column names
    leads = []
    for row in rows:
        normalized = {}
        for col, val in row.items():
            field = _normalize_column(col)
            if field in B2BLead.model_fields:
                normalized[field] = _clean(val)

        # Build full name if not present
        if not normalized.get("name"):
            first = normalized.get("first_name", "") or ""
            last = normalized.get("last_name", "") or ""
            full = f"{first} {last}".strip()
            if full:
                normalized["name"] = full

        # Generate ID
        normalized["id"] = str(uuid.uuid4())

        # Only include rows with at least a name or email
        if normalized.get("name") or normalized.get("email"):
            leads.append(normalized)

    return {
        "data": leads,
        "total": len(leads),
        "columns_detected": list(rows[0].keys()) if rows else [],
        "message": f"Successfully parsed {len(leads)} leads from {file.filename}",
    }


@router.post("/evaluate")
async def evaluate_b2b_leads(body: B2BEvaluateRequest):
    """
    Score B2B leads based on data completeness and title seniority.
    """
    scored = []
    for lead in body.leads:
        score, priority, reasoning = _score_b2b_lead(lead)
        scored.append({
            **lead,
            "lead_score": score,
            "priority": priority,
            "reasoning": reasoning,
        })

    # Sort by score descending (best leads first)
    scored.sort(key=lambda x: x["lead_score"], reverse=True)

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


@router.post("/export")
async def export_b2b_leads(body: B2BEvaluateRequest):
    """
    Export B2B leads to a CSV file.
    """
    if not body.leads:
        raise HTTPException(400, "No leads to export")

    output = io.StringIO()
    # Get headers from first lead or use standard ones
    headers = list(body.leads[0].keys())
    # Ensure id is first if present
    if "id" in headers:
        headers.remove("id")
        headers = ["id"] + headers

    writer = csv.DictWriter(output, fieldnames=headers)
    writer.writeheader()
    writer.writerows(body.leads)

    return {
        "csv": output.getvalue(),
        "filename": f"b2b_leads_export_{int(time.time())}.csv"
    }
