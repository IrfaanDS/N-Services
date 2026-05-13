"""
SEO Domain Agent
────────────────
Replaces the old reactive SEO chatbot with a proper LangGraph agent
that reasons, uses tools, and makes decisions.
"""
import uuid
import logging
from langchain_core.messages import HumanMessage

from app.agents.graph import build_agent_graph
from app.agents.memory import get_memory_store
from app.agents.prompts import SEO_SYSTEM_PROMPT
from app.agents.tools.seo_tools import (
    query_seo_leads,
    evaluate_leads,
    audit_website,
    search_seo_knowledge,
    generate_outreach_email,
    queue_emails_for_sending,
    get_dashboard_stats,
)
from app.agents.tools.common import read_inbox, read_email_thread, critique_email

logger = logging.getLogger(__name__)

# ── Tool registry ────────────────────────────────────────────────────────────
SEO_TOOLS = [
    query_seo_leads,
    evaluate_leads,
    audit_website,
    search_seo_knowledge,
    generate_outreach_email,
    queue_emails_for_sending,
    get_dashboard_stats,
    read_inbox,
    read_email_thread,
    critique_email,
]

# ── Compiled graph (singleton, built once) ───────────────────────────────────
_graph = None


def _get_graph():
    global _graph
    if _graph is None:
        _graph = build_agent_graph(SEO_TOOLS, SEO_SYSTEM_PROMPT)
    return _graph


class SEOAgent:
    """
    SEO Domain Agent.
    Wraps the LangGraph ReAct graph with session memory management.
    """

    def __init__(self):
        self.memory = get_memory_store()
        self.graph = _get_graph()

    def invoke(self, session_id: str, message: str) -> dict:
        """
        Process a user message through the SEO agent.

        Args:
            session_id: Session ID for conversation continuity.
            message: The user's message/question.

        Returns:
            dict with keys: response, session_id, tools_used
        """
        # 1. Load existing history
        history = self.memory.get_history(session_id)

        # 2. Add the new user message
        history.append(HumanMessage(content=message))

        # 3. Build initial state
        state = {
            "messages": history,
            "domain": "seo",
            "context": {},  # Will be populated on first request via tool
        }

        # 4. Run the graph
        try:
            result = self.graph.invoke(state)
        except Exception as e:
            logger.error(f"SEO Agent graph execution error: {e}", exc_info=True)
            return {
                "response": f"I encountered an error processing your request: {str(e)}",
                "session_id": session_id,
                "tools_used": [],
            }

        # 5. Extract the final response and tools used
        all_messages = result["messages"]
        final_message = all_messages[-1]
        response_text = final_message.content if hasattr(final_message, "content") else str(final_message)

        # Track which tools were called
        tools_used = []
        for msg in all_messages:
            if hasattr(msg, "tool_calls") and msg.tool_calls:
                for tc in msg.tool_calls:
                    tools_used.append(tc.get("name", "unknown"))

        # 6. Save updated history
        self.memory.save_history(session_id, all_messages)

        return {
            "response": response_text,
            "session_id": session_id,
            "tools_used": tools_used,
        }

    def clear_session(self, session_id: str) -> None:
        """Clear conversation history for a session."""
        self.memory.clear(session_id)

    def create_session(self) -> str:
        """Create a new session ID."""
        return str(uuid.uuid4())


# ── Module-level singleton ───────────────────────────────────────────────────
_seo_agent = None


def get_seo_agent() -> SEOAgent:
    """Return the global SEO agent singleton."""
    global _seo_agent
    if _seo_agent is None:
        _seo_agent = SEOAgent()
    return _seo_agent
