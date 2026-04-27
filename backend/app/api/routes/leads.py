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


def _apply_filters(query, niche=None, city=None, country=None, search=None):
    """
    Apply optional filters to a Supabase query builder.
    """
    if niche:
        query = query.ilike("niche", niche)
    if city:
        query = query.ilike("city", city)
    if country:
        query = query.ilike("country", country)
    if search:
        query = query.or_(
            f"name.ilike.%{search}%,"
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

    # 1. Build query for data and exact count
    columns = (
        "id, name, website_url, niche, city, country, created_at, "
        "contacts(email, phone, linkedin, instagram, facebook)"
    )
    query = supabase.schema("common").table("businesses").select(columns, count="exact")
    
    # 2. Apply filters
    query = _apply_filters(query, niche, city, country, search)
    
    # 3. Execute with pagination
    try:
        result = query.range(offset, offset + page_size - 1).execute()
        total = result.count or 0
        
        # Fallback to public schema if common is empty (just in case of env sync issues)
        if total == 0:
            query_fallback = supabase.table("businesses").select(
                "id, name, website_url, niche, city, country, created_at, "
                "business_contacts(email, phone, linkedin, instagram, facebook)",
                count="exact"
            )
            query_fallback = _apply_filters(query_fallback, niche, city, country, search)
            result = query_fallback.range(offset, offset + page_size - 1).execute()
            total = result.count or 0
            
            # Map 'business_contacts' back to 'contacts' for the flattening logic below
            for row in (result.data or []):
                if "business_contacts" in row:
                    row["contacts"] = row.pop("business_contacts")
    except Exception as e:
        import logging
        logging.error(f"Primary query failed, attempting public fallback: {e}")
        query_fallback = supabase.table("businesses").select(
            "id, name, website_url, niche, city, country, created_at, "
            "business_contacts(email, phone, linkedin, instagram, facebook)",
            count="exact"
        )
        query_fallback = _apply_filters(query_fallback, niche, city, country, search)
        result = query_fallback.range(offset, offset + page_size - 1).execute()
        total = result.count or 0
        for row in (result.data or []):
            if "business_contacts" in row:
                row["contacts"] = row.pop("business_contacts")

    # 4. Flatten the contacts join with extreme robustness
    leads = []
    try:
        for row in (result.data or []):
            # The join might return a list, a dict, or None
            contacts_raw = row.pop("contacts", None)
            contact = {}
            
            if isinstance(contacts_raw, list) and contacts_raw:
                contact = contacts_raw[0]
            elif isinstance(contacts_raw, dict):
                contact = contacts_raw
            
            if contact is None:
                contact = {}

            leads.append({
                "id": row.get("id"),
                "business_name": _clean(row.get("name")),
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
    except Exception as e:
        import logging
        logging.error(f"Error processing leads data: {e}")
        # Return what we have or an empty list instead of crashing
        pass

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
    niches_result = supabase.schema("common").table("businesses").select("niche").execute()
    niches = sorted(set(
        row["niche"] for row in (niches_result.data or [])
        if row.get("niche")
    ))

    # Get distinct cities
    cities_result = supabase.schema("common").table("businesses").select("city").execute()
    cities = sorted(set(
        row["city"] for row in (cities_result.data or [])
        if row.get("city")
    ))

    # Get distinct countries
    countries_result = supabase.schema("common").table("businesses").select("country").execute()
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
    # Build query
    columns = (
        "id, name, website_url, niche, city, country, created_at, "
        "contacts(email, phone, linkedin, instagram, facebook)"
    )
    query = supabase.schema("common").table("businesses").select(columns)
    query = _apply_filters(query, niche, city, country, search)
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
        contacts = row.get("contacts", [])
        if isinstance(contacts, list):
            contact = contacts[0] if contacts else {}
        else:
            contact = contacts if contacts else {}
        writer.writerow([
            row.get("name", ""),
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
