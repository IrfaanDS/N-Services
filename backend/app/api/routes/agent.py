"""
Unified Agent Routes
────────────────────
Single endpoint pattern for all three domain agents.
POST /api/agent/{domain}/chat   — send a message
POST /api/agent/{domain}/clear  — clear session
GET  /api/agent/{domain}/health — health check
"""
import uuid
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter()
logger = logging.getLogger(__name__)

VALID_DOMAINS = {"seo", "b2b", "shopify"}


class ChatRequest(BaseModel):
    session_id: Optional[str] = None
    message: str


class ChatResponse(BaseModel):
    response: str
    session_id: str
    tools_used: List[str] = []


class ClearRequest(BaseModel):
    session_id: str


def _get_agent(domain: str):
    """Lazy-load the correct agent for the given domain."""
    if domain == "seo":
        from app.agents.seo_agent import get_seo_agent
        return get_seo_agent()
    elif domain == "b2b":
        from app.agents.b2b_agent import get_b2b_agent
        return get_b2b_agent()
    elif domain == "shopify":
        from app.agents.shopify_agent import get_shopify_agent
        return get_shopify_agent()
    else:
        raise HTTPException(status_code=400, detail=f"Invalid domain: {domain}. Must be one of: {VALID_DOMAINS}")


@router.post("/{domain}/chat", response_model=ChatResponse)
async def agent_chat(domain: str, request: ChatRequest):
    """
    Send a message to a domain agent and get a response.
    The agent will reason, call tools, and produce a synthesized answer.
    """
    if domain not in VALID_DOMAINS:
        raise HTTPException(status_code=400, detail=f"Invalid domain: {domain}")

    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    # Generate session ID if not provided
    session_id = request.session_id or str(uuid.uuid4())

    agent = _get_agent(domain)

    try:
        result = agent.invoke(session_id, request.message.strip())
    except Exception as e:
        logger.error(f"Agent {domain} invoke error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")

    return ChatResponse(
        response=result["response"],
        session_id=result["session_id"],
        tools_used=result.get("tools_used", []),
    )


@router.post("/{domain}/clear")
async def agent_clear(domain: str, request: ClearRequest):
    """Clear conversation history for a session."""
    if domain not in VALID_DOMAINS:
        raise HTTPException(status_code=400, detail=f"Invalid domain: {domain}")

    agent = _get_agent(domain)
    agent.clear_session(request.session_id)
    return {"status": "success", "message": "Session cleared"}


@router.get("/{domain}/health")
async def agent_health(domain: str):
    """Health check for a domain agent."""
    if domain not in VALID_DOMAINS:
        raise HTTPException(status_code=400, detail=f"Invalid domain: {domain}")

    from app.agents.memory import get_memory_store
    memory = get_memory_store()

    return {
        "status": "ok",
        "domain": domain,
        "active_sessions": memory.active_sessions,
    }
