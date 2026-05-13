"""
B2B Domain Agent
────────────────
New agent that lives alongside the existing B2B pipeline.
Provides intelligent, conversational access to B2B lead management.
"""
import uuid
import logging
from langchain_core.messages import HumanMessage

from app.agents.graph import build_agent_graph
from app.agents.memory import get_memory_store
from app.agents.prompts import B2B_SYSTEM_PROMPT
from app.agents.tools.b2b_tools import (
    query_b2b_leads,
    score_b2b_leads,
    build_buyer_personas,
    generate_email_sequence,
    queue_emails_for_sending,
    get_dashboard_stats,
)
from app.agents.tools.common import read_inbox, read_email_thread, critique_email

logger = logging.getLogger(__name__)

# ── Tool registry ────────────────────────────────────────────────────────────
B2B_TOOLS = [
    query_b2b_leads,
    score_b2b_leads,
    build_buyer_personas,
    generate_email_sequence,
    queue_emails_for_sending,
    get_dashboard_stats,
    read_inbox,
    read_email_thread,
    critique_email,
]

# ── Compiled graph ───────────────────────────────────────────────────────────
_graph = None


def _get_graph():
    global _graph
    if _graph is None:
        _graph = build_agent_graph(B2B_TOOLS, B2B_SYSTEM_PROMPT)
    return _graph


class B2BAgent:
    """
    B2B Domain Agent.
    Wraps the LangGraph ReAct graph with session memory management.
    """

    def __init__(self):
        self.memory = get_memory_store()
        self.graph = _get_graph()

    def invoke(self, session_id: str, message: str) -> dict:
        """
        Process a user message through the B2B agent.

        Args:
            session_id: Session ID for conversation continuity.
            message: The user's message/question.

        Returns:
            dict with keys: response, session_id, tools_used
        """
        history = self.memory.get_history(session_id)
        history.append(HumanMessage(content=message))

        state = {
            "messages": history,
            "domain": "b2b",
            "context": {},
        }

        try:
            result = self.graph.invoke(state)
        except Exception as e:
            logger.error(f"B2B Agent graph execution error: {e}", exc_info=True)
            return {
                "response": f"I encountered an error processing your request: {str(e)}",
                "session_id": session_id,
                "tools_used": [],
            }

        all_messages = result["messages"]
        final_message = all_messages[-1]
        response_text = final_message.content if hasattr(final_message, "content") else str(final_message)

        tools_used = []
        for msg in all_messages:
            if hasattr(msg, "tool_calls") and msg.tool_calls:
                for tc in msg.tool_calls:
                    tools_used.append(tc.get("name", "unknown"))

        self.memory.save_history(session_id, all_messages)

        return {
            "response": response_text,
            "session_id": session_id,
            "tools_used": tools_used,
        }

    def clear_session(self, session_id: str) -> None:
        self.memory.clear(session_id)

    def create_session(self) -> str:
        return str(uuid.uuid4())


# ── Module-level singleton ───────────────────────────────────────────────────
_b2b_agent = None


def get_b2b_agent() -> B2BAgent:
    global _b2b_agent
    if _b2b_agent is None:
        _b2b_agent = B2BAgent()
    return _b2b_agent
