from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy import create_engine, text
from enum import Enum

from app.services.shopify.config import POSTGRES_URL
from app.services.shopify.onboarding_service import onboard_new_store

import logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/leads", tags=["Leads Dashboard"])

# Configure Postgres engine
def get_pg_engine():
    from app.services.shopify.config import POSTGRES_URL
    if not POSTGRES_URL:
        logger.error("❌ POSTGRES_URL is not set!")
        return None
    try:
        return create_engine(POSTGRES_URL)
    except Exception as e:
        logger.error(f"❌ Failed to create engine: {e}")
        return None

pg_engine = get_pg_engine()

class OutreachStatus(str, Enum):
    pending = "pending"
    queued = "queued"
    sent = "sent"
    replied = "replied"
    converted = "converted"
    dead = "dead"

class OutreachRequest(BaseModel):
    status: OutreachStatus = OutreachStatus.pending

@router.get("")
def get_leads(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    tier: Optional[str] = None,
    niche: Optional[str] = None,
    country: Optional[str] = None,
    sort_by: str = Query("lead_score", regex="^(lead_score|created_at|niche)$")
):
    """Get paginated leads from the dashboard view."""
    global pg_engine
    if not pg_engine:
        pg_engine = get_pg_engine()
        
    if not pg_engine:
        raise HTTPException(status_code=500, detail="Database not configured (POSTGRES_URL missing or invalid)")

    offset = (page - 1) * page_size
    
    # Build conditions
    conditions = []
    params = {}
    
    if tier:
        conditions.append("tier = :tier")
        params["tier"] = tier
    if niche:
        conditions.append("niche ILIKE :niche")
        params["niche"] = f"%{niche}%"
    if country:
        conditions.append("country = :country")
        params["country"] = country
        
    where_clause = " AND ".join(conditions) if conditions else "1=1"
    
    # Secure sort mappings
    sort_map = {
        "lead_score": "lead_score DESC NULLS LAST",
        "created_at": "created_at DESC NULLS LAST",
        "niche": "niche ASC NULLS LAST"
    }
    order_by = sort_map.get(sort_by, "lead_score DESC NULLS LAST")
    
    query_sql = f"""
        SELECT *
        FROM shopify.lead_dashboard
        WHERE {where_clause}
        ORDER BY {order_by}
        LIMIT :limit OFFSET :offset
    """
    
    count_sql = f"""
        SELECT COUNT(*) as total
        FROM shopify.lead_dashboard
        WHERE {where_clause}
    """
    
    params["limit"] = page_size
    params["offset"] = offset

    try:
        with pg_engine.connect() as conn:
            total_result = conn.execute(text(count_sql), params).scalar()
            rows = conn.execute(text(query_sql), params).mappings().all()
            
            data = [dict(row) for row in rows]
            total_pages = (total_result + page_size - 1) // page_size if total_result else 0
            
            return {
                "data": data,
                "total": total_result,
                "page": page,
                "page_size": page_size,
                "total_pages": total_pages
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{business_id}")
def get_lead(business_id: str):
    if not pg_engine:
        raise HTTPException(status_code=500, detail="Database not configured")
        
    query_sql = """
        SELECT *
        FROM shopify.lead_dashboard
        WHERE business_id = :business_id
    """
    try:
        with pg_engine.connect() as conn:
            row = conn.execute(text(query_sql), {"business_id": business_id}).mappings().first()
            if not row:
                raise HTTPException(status_code=404, detail="Lead not found")
            return dict(row)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{business_id}/create-store")
async def create_store_for_lead(business_id: str):
    if not pg_engine:
        raise HTTPException(status_code=500, detail="Database not configured")
        
    try:
        with pg_engine.connect() as conn:
            # 1. Get the lead's domain and name
            lead = conn.execute(text("SELECT website_url, name FROM common.businesses WHERE id = :business_id"), {"business_id": business_id}).mappings().first()
            if not lead:
                raise HTTPException(status_code=404, detail="Business not found")
                
            domain = lead["website_url"]
            brand_name = lead["name"]
            
            # 2. Call existing onboarding service
            result, error = await onboard_new_store(domain, brand_name)
            
            if error and error != "STORE_ALREADY_EXISTS":
                raise HTTPException(status_code=400, detail=f"Failed to provision store: {error}")
            
            store_id = result["store_id"]
            
            # 3. Update Postgres
            update_sql = """
                UPDATE shopify.stores
                SET assistant_created = TRUE,
                    assistant_created_at = now(),
                    mongo_store_id = :mongo_store_id
                WHERE business_id = :business_id
            """
            
            with conn.begin():
                conn.execute(text(update_sql), {"mongo_store_id": store_id, "business_id": business_id})
                
            return {"status": "success", "mongo_store_id": store_id}
            
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Error provisioning store: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{business_id}/outreach")
def create_outreach(business_id: str, payload: OutreachRequest):
    if not pg_engine:
        raise HTTPException(status_code=500, detail="Database not configured")
        
    try:
        with pg_engine.connect() as conn:
            # Check if store_id exists
            store = conn.execute(text("SELECT id FROM shopify.stores WHERE business_id = :business_id"), {"business_id": business_id}).mappings().first()
            if not store:
                raise HTTPException(status_code=404, detail="Store not found for this business")
                
            store_id = store["id"]
            
            insert_sql = """
                INSERT INTO outreach.shopify_outreach (business_id, store_id, status)
                VALUES (:business_id, :store_id, :status)
                RETURNING id
            """
            
            with conn.begin():
                result = conn.execute(text(insert_sql), {
                    "business_id": business_id,
                    "store_id": store_id,
                    "status": payload.status.value
                })
                outreach_id = result.scalar()
                
            return {"status": "success", "outreach_id": str(outreach_id)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
