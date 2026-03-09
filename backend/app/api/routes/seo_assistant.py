"""
SEO Assistant Routes (RAG-Powered Agent)
────────────────────────────────────────
Chat endpoint for the SEO expert assistant.
Uses ChromaDB + Gemini agentic tool-calling with conversation history.
"""
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.rag import generate_answer

router = APIRouter()
logger = logging.getLogger(__name__)

# In-memory session storage
conversation_history: dict[str, list] = {}


class AskPayload(BaseModel):
    session_id: str
    question: str


class ClearPayload(BaseModel):
    session_id: str


@router.post("/ask")
async def ask_seo_assistant(payload: AskPayload):
    """
    Ask the SEO expert agent a question or provide a URL for audit.
    Maintains per-session conversation history.
    """
    session_id = payload.session_id
    question = payload.question.strip()

    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    # Get or initialize session history
    current_history = conversation_history.get(session_id, [])

    try:
        answer = generate_answer(question, history=current_history)
    except Exception as e:
        logger.exception(f"RAG generate_answer failed: {e}")
        raise HTTPException(status_code=500, detail=f"Assistant error: {str(e)}")

    # Update history
    current_history.append({"question": question, "answer": answer})
    conversation_history[session_id] = current_history

    return {"answer": answer, "session_id": session_id}


@router.post("/clear")
async def clear_session(payload: ClearPayload):
    """Clear conversation history for a session."""
    conversation_history.pop(payload.session_id, None)
    return {"status": "success", "message": "Session cleared"}


@router.get("/health")
async def assistant_health():
    """Check if the RAG service is loaded."""
    from app.services.rag import gemini_client, collection
    return {
        "status": "ok",
        "gemini_configured": gemini_client is not None,
        "knowledge_base_chunks": collection.count(),
    }
