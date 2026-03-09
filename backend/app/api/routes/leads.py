"""
Lead Acquisition Routes
─────────────────────────
Query businesses from Supabase with filters (niche, city, country).
Returns paginated results and CSV export.
Joins business_contacts for email/phone/socials.
"""
from fastapi import APIRouter, Query, Depends
from fastapi.responses import StreamingResponse
from typing import Optional
import csv
import io

from app.api.deps import get_supabase

router = APIRouter()


def _clean(value):
    """Clean 'NaN' and empty strings from Supabase data."""
    if value is None or str(value).strip().lower() in ("nan", "none", ""):
        return None
    return value


def _build_lead_query(supabase, niche=None, city=None, country=None, search=None):
    """
    Build a Supabase query on the businesses table with optional filters.
    Returns the query builder (not yet executed).
    """
    query = supabase.table("businesses").select(
        "id, business_name, website_url, niche, city, country, created_at, "
        "business_contacts(email, phone, linkedin, instagram, facebook)"
    )

    if niche:
        query = query.eq("niche", niche)
    if city:
        query = query.eq("city", city)
    if country:
        query = query.eq("country", country)
    if search:
        query = query.or_(
            f"business_name.ilike.%{search}%,"
            f"website_url.ilike.%{search}%"
        )

    return query


@router.get("/")
async def get_leads(
    niche: Optional[str] = Query(None, description="Filter by business niche"),
    city: Optional[str] = Query(None, description="Filter by city"),
    country: Optional[str] = Query(None, description="Filter by country"),
    search: Optional[str] = Query(None, description="Search by name or website"),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    supabase=Depends(get_supabase),
):
    """
    Retrieve leads from the businesses table with optional filters.
    Joins business_contacts to include email, phone, socials.
    Returns paginated results.
    """
    # Calculate offset
    offset = (page - 1) * page_size

    # Build and execute query
    query = _build_lead_query(supabase, niche, city, country, search)
    result = query.range(offset, offset + page_size - 1).execute()

    # Get total count (separate query)
    count_query = _build_lead_query(supabase, niche, city, country, search)
    count_result = count_query.execute()
    total = len(count_result.data) if count_result.data else 0

    # Flatten the business_contacts join
    leads = []
    for row in (result.data or []):
        contacts = row.pop("business_contacts", [])
        contact = contacts[0] if contacts else {}
        leads.append({
            "id": row.get("id"),
            "business_name": _clean(row.get("business_name")),
            "website_url": _clean(row.get("website_url")),
            "niche": _clean(row.get("niche")),
            "city": _clean(row.get("city")),
            "country": _clean(row.get("country")),
            "created_at": row.get("created_at"),
            "email": _clean(contact.get("email")),
            "phone": _clean(contact.get("phone")),
            "linkedin": _clean(contact.get("linkedin")),
            "instagram": _clean(contact.get("instagram")),
            "facebook": _clean(contact.get("facebook")),
        })

    return {
        "data": leads,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/filters")
async def get_filter_options(supabase=Depends(get_supabase)):
    """
    Return distinct values for each filter column to populate dropdowns.
    Queries SELECT DISTINCT niche/city/country FROM businesses.
    """
    # Get distinct niches
    niches_result = supabase.table("businesses").select("niche").execute()
    niches = sorted(set(
        row["niche"] for row in (niches_result.data or [])
        if row.get("niche")
    ))

    # Get distinct cities
    cities_result = supabase.table("businesses").select("city").execute()
    cities = sorted(set(
        row["city"] for row in (cities_result.data or [])
        if row.get("city")
    ))

    # Get distinct countries
    countries_result = supabase.table("businesses").select("country").execute()
    countries = sorted(set(
        row["country"] for row in (countries_result.data or [])
        if row.get("country")
    ))

    return {
        "niches": niches,
        "cities": cities,
        "countries": countries,
    }


@router.get("/export")
async def export_leads_csv(
    niche: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    country: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    supabase=Depends(get_supabase),
):
    """
    Export filtered leads as a downloadable CSV file.
    Includes: business_name, website_url, niche, city, country, email, phone.
    """
    query = _build_lead_query(supabase, niche, city, country, search)
    result = query.execute()

    # Build CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow([
        "business_name", "website_url", "niche", "city", "country",
        "email", "phone", "linkedin", "instagram", "facebook",
    ])

    # Rows
    for row in (result.data or []):
        contacts = row.get("business_contacts", [])
        contact = contacts[0] if contacts else {}
        writer.writerow([
            row.get("business_name", ""),
            row.get("website_url", ""),
            row.get("niche", ""),
            row.get("city", ""),
            row.get("country", ""),
            contact.get("email", ""),
            contact.get("phone", ""),
            contact.get("linkedin", ""),
            contact.get("instagram", ""),
            contact.get("facebook", ""),
        ])

    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=leads_export.csv",
        },
    )
