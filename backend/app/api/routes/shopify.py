"""
FastAPI Backend for the Multi-Store Shopify RAG Platform.
Provides store-aware chat and session management endpoints using MongoDB.
"""

import logging
from contextlib import asynccontextmanager
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, HTTPException, Request, Header, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from email.message import EmailMessage

from app.api.deps import get_supabase
from app.api.routes.sending import send_smtp

from app.services.shopify.config import GROQ_API_KEY, ADMIN_PASSWORD
from app.services.shopify.memory_manager import MemoryManager
from app.services.shopify.store_manager import MongoDBStoreManager
from app.services.shopify.rag_engine import run_rag_pipeline
from app.services.shopify.onboarding_service import onboard_new_store
from app.api.routes.shopify_leads import router as leads_router


# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(levelname)-8s │ %(name)s │ %(message)s",
)
logger = logging.getLogger(__name__)

# ── Global state ──────────────────────────────────────────────────────────────
memory = MemoryManager()
store_manager = MongoDBStoreManager()


# ══════════════════════════════════════════════════════════════════════════════
#  LIFESPAN (startup / shutdown)
# ══════════════════════════════════════════════════════════════════════════════

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run on startup: validate config."""
    logger.info("🚀 Starting Shopify RAG Platform...")

    if not GROQ_API_KEY:
        logger.error("❌ GROQ_API_KEY is not set! Add it to .env")
    else:
        logger.info("✅ GROQ_API_KEY is configured")

    # Ensure MongoDB text indexes exist for fast product search
    try:
        await store_manager.ensure_indexes()
    except Exception as e:
        logger.warning(f"⚠️ Could not ensure MongoDB indexes at startup: {e}")

    # The store_manager fetches from MongoDB when needed instead of preloading all.
    yield
    logger.info("👋 Shutting down Shopify RAG Platform.")


# ══════════════════════════════════════════════════════════════════════════════
#  APP INITIALIZATION
# ══════════════════════════════════════════════════════════════════════════════

from fastapi import APIRouter
router = APIRouter()

router.include_router(leads_router)

# ══════════════════════════════════════════════════════════════════════════════
#  REQUEST / RESPONSE MODELS
# ══════════════════════════════════════════════════════════════════════════════

class ChatRequest(BaseModel):
    """Incoming chat message."""
    message: str = Field(..., min_length=1, max_length=2000, description="The user's question or message.")
    session_id: Optional[str] = Field(None, description="Optional session ID for conversation continuity.")


class ChatResponse(BaseModel):
    """Chat response with metadata."""
    response: str = Field(..., description="The assistant's JSON-formatted answer.")
    session_id: str = Field(..., description="Session ID to use for follow-up messages.")
    intent: str = Field(..., description="Detected intent category.")
    action: Optional[dict] = Field(None, description="Cart action for the frontend to execute against Shopify AJAX API.")



class SessionInfo(BaseModel):
    """Session metadata."""
    session_id: str
    message_count: int
    created_at: float
    last_activity: float


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    active_sessions: int
    groq_configured: bool


class VerifyRequest(BaseModel):
    """Payload for verify endpoint"""
    store_id: str
    api_key: str


class AdminOnboardRequest(BaseModel):
    """Payload for admin onboarding"""
    domain: str
    brand_name: Optional[str] = None

class OnboardRequest(BaseModel):
    """Payload for public onboarding"""
    url: str
    brand_name: Optional[str] = None


class AdminLoginRequest(BaseModel):
    """Payload for admin authentication"""
    password: str

class OutreachRequest(BaseModel):
    """Payload for sending Shopify outreach"""
    store_id: str
    recipient_email: str
    subject: str
    body: str




# ══════════════════════════════════════════════════════════════════════════════
#  ENDPOINTS — Health & Platform
# ══════════════════════════════════════════════════════════════════════════════

@router.get("", tags=["Health"])
async def root():
    """Root endpoint — platform info."""
    return {
        "service": "Shopify RAG Platform",
        "version": "3.0.0",
        "docs": "/docs",
    }


@router.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """Check server health and configuration status."""
    memory.cleanup_expired()
    return HealthResponse(
        status="healthy",
        active_sessions=memory.active_session_count,
        groq_configured=bool(GROQ_API_KEY),
    )


# ══════════════════════════════════════════════════════════════════════════════
#  ENDPOINTS — Store Management (Authenticated)
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/store/verify", tags=["Stores"])
async def verify_store_credentials(req: VerifyRequest):
    """Frontend endpoint to perform Login/Verification."""
    is_valid = await store_manager.verify_store(req.store_id, req.api_key)
    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid Store ID or API Key")
    return {"message": "Success", "status": "authenticated"}


@router.post("/store/onboard", tags=["Stores"])
async def public_onboard_store(req: OnboardRequest):
    """Public endpoint to onboard a new store via URL."""
    result, error = await onboard_new_store(req.url, req.brand_name)
    if error == "STORE_ALREADY_EXISTS":
        result["already_exists"] = True
        return result
    if error:
        raise HTTPException(status_code=400, detail=error)
    return result


@router.get("/store/{store_id}/config", tags=["Stores"])
async def get_store_config(store_id: str):
    """Get store configuration for frontend theming."""
    config = await store_manager.get_store_config_only(store_id)
    if not config:
        raise HTTPException(status_code=404, detail=f"Store '{store_id}' not found.")

    return config


# ══════════════════════════════════════════════════════════════════════════════
#  ENDPOINTS — Outreach
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/outreach/send", tags=["Outreach"])
async def send_shopify_outreach(req: OutreachRequest, supabase=Depends(get_supabase)):
    """Send an outreach email for a Shopify store."""
    res = supabase.schema("outreach").table("b2b_sending_accounts").select("*").execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="No sending accounts configured in the system.")
    
    account = res.data[0]
    
    msg = EmailMessage()
    msg.set_content(req.body)
    msg["Subject"] = req.subject
    msg["From"] = f"{account['name']} <{account['smtp_user']}>"
    msg["To"] = req.recipient_email
    
    try:
        send_smtp(msg, account)
        return {"status": "success", "message": f"Outreach email sent to {req.recipient_email}"}
    except Exception as e:
        logger.error(f"Outreach send error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")


# ══════════════════════════════════════════════════════════════════════════════
#  ENDPOINTS — Chat (Multi-Store)
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/chat/{store_id}", response_model=ChatResponse, tags=["Chat"])
async def chat(store_id: str, request: ChatRequest):
    """
    Send a message to a store's AI shopping assistant.
    """
    if not GROQ_API_KEY:
        raise HTTPException(status_code=503, detail="GROQ_API_KEY is not configured.")

    # Get store data asynchronously from MongoDB
    store = await store_manager.get_store(store_id)
    if not store:
        raise HTTPException(status_code=404, detail=f"Store '{store_id}' not found.")

    # Get or create session
    session_id, session = memory.get_or_create_session(request.session_id)

    try:
        # RAG pipeline logic is asynchronous to avoid blocking the event loop
        result = await run_rag_pipeline(request.message, session, store, store_manager)
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"RAG pipeline error for store '{store_id}': {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

    return ChatResponse(
        response=result["response"],
        session_id=result["session_id"],
        intent=result["intent"],
        action=result.get("action"),
    )



# ══════════════════════════════════════════════════════════════════════════════
#  ENDPOINTS — Session Management
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/session/new", tags=["Session"])
async def create_session():
    """Create a new conversation session."""
    session_id = memory.create_session()
    return {"session_id": session_id}


@router.get("/session/{session_id}", response_model=SessionInfo, tags=["Session"])
async def get_session_info(session_id: str):
    """Get information about an existing session."""
    session = memory.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or expired.")
    return SessionInfo(
        session_id=session.session_id,
        message_count=len(session.messages),
        created_at=session.created_at,
        last_activity=session.last_activity,
    )


# ══════════════════════════════════════════════════════════════════════════════
#  ENDPOINTS — Admin Management
# ══════════════════════════════════════════════════════════════════════════════

# ── Admin Auth Helper ─────────────────────────────────────────────────────────

async def verify_admin(x_admin_password: Optional[str] = Header(None, alias="X-Admin-Password")):
    from app.services.shopify.config import ADMIN_PASSWORD
    if not x_admin_password or x_admin_password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid Admin Password")
    return True


@router.post("/admin/login", tags=["Admin"])
async def admin_login(req: AdminLoginRequest):
    """Verify admin password."""
    from app.services.shopify.config import ADMIN_PASSWORD
    if ADMIN_PASSWORD and req.password == ADMIN_PASSWORD:
        return {"status": "success", "message": "Authenticated"}
    raise HTTPException(status_code=401, detail="Invalid password")


@router.get("/admin/stores", tags=["Admin"])
async def list_all_stores(skip: int = 0, limit: int = 50, _=Depends(verify_admin)):
    """List all stores in the system with full keys (Admin only)."""
    stores, total = await store_manager.list_stores_with_keys(skip, limit)
    return {
        "stores": stores,
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.post("/admin/onboard", tags=["Admin"])
async def admin_onboard_store(req: AdminOnboardRequest, _=Depends(verify_admin)):
    """Onboard a new store via URL (Admin only)."""
    result, error = await onboard_new_store(req.domain, req.brand_name)
    if error:
        raise HTTPException(status_code=400, detail=error)
    return result


@router.delete("/admin/stores/{store_id}", tags=["Admin"])
async def admin_delete_store(store_id: str, _=Depends(verify_admin)):
    """Remove a store from the platform (Admin only)."""
    success = await store_manager.delete_store(store_id)
    if not success:
        raise HTTPException(status_code=404, detail="Store not found.")

    # Sync with Postgres leads dashboard
    from .shopify_leads import pg_engine
    from sqlalchemy import text
    if pg_engine:
        try:
            with pg_engine.begin() as conn:
                conn.execute(
                    text("UPDATE shopify.stores SET assistant_created = FALSE, mongo_store_id = NULL WHERE mongo_store_id = :store_id"),
                    {"store_id": store_id}
                )
        except Exception as e:
            logger.error(f"Failed to sync deletion with Postgres for store {store_id}: {e}")

    return {"message": f"Store '{store_id}' and all its products deleted."}




# ══════════════════════════════════════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════════════════════════════════════


