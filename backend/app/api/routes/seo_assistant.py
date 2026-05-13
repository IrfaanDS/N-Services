"""
SEO Assistant Routes (LangGraph Agent)
────────────────────────────────────────
Chat endpoint for the SEO expert assistant.
Now powered by a LangGraph ReAct agent with tool-calling via Groq Llama.

The endpoint contract is UNCHANGED so the frontend doesn't need modifications:
  POST /api/assistant/ask   → { session_id, question } → { answer, session_id }
  POST /api/assistant/clear → { session_id }           → { status, message }
  GET  /api/assistant/health                           → { status, ... }
"""
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()
logger = logging.getLogger(__name__)


class AskPayload(BaseModel):
    session_id: str
    question: str


class ClearPayload(BaseModel):
    session_id: str


@router.post("/ask")
async def ask_seo_assistant(payload: AskPayload):
    """
    Ask the SEO expert agent a question or provide a URL for audit.
    Delegates to the LangGraph SEO Agent which reasons, calls tools,
    and produces a synthesized response.
    """
    session_id = payload.session_id
    question = payload.question.strip()

    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    try:
        from app.agents.seo_agent import get_seo_agent
        agent = get_seo_agent()
        result = agent.invoke(session_id, question)
    except Exception as e:
        logger.exception(f"SEO Agent failed: {e}")
        raise HTTPException(status_code=500, detail=f"Assistant error: {str(e)}")

    return {"answer": result["response"], "session_id": result["session_id"]}


@router.post("/clear")
async def clear_session(payload: ClearPayload):
    """Clear conversation history for a session."""
    try:
        from app.agents.seo_agent import get_seo_agent
        agent = get_seo_agent()
        agent.clear_session(payload.session_id)
    except Exception:
        pass  # If agent isn't initialized yet, nothing to clear
    return {"status": "success", "message": "Session cleared"}


@router.get("/health")
async def assistant_health():
    """Check if the agent and RAG service are loaded."""
    from app.services.rag import collection
    from app.agents.memory import get_memory_store

    memory = get_memory_store()
    return {
        "status": "ok",
        "agent": "langgraph_seo",
        "knowledge_base_chunks": collection.count(),
        "active_sessions": memory.active_sessions,
    }
