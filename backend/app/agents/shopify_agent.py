"""
Shopify Domain Agent
────────────────────
Admin-side agent for managing the Shopify store pipeline.
This is NOT the customer-facing store chatbot (which remains untouched).
"""
import uuid
import logging
from langchain_core.messages import HumanMessage

from app.agents.graph import build_agent_graph
from app.agents.memory import get_memory_store
from app.agents.prompts import SHOPIFY_SYSTEM_PROMPT
from app.agents.tools.shopify_tools import (
    query_store_leads,
    get_store_detail,
    provision_assistant,
    generate_store_outreach,
    send_outreach_email,
    get_dashboard_stats,
)
from app.agents.tools.common import read_inbox, read_email_thread, critique_email

logger = logging.getLogger(__name__)

# ── Tool registry ────────────────────────────────────────────────────────────
SHOPIFY_TOOLS = [
    query_store_leads,
    get_store_detail,
    provision_assistant,
    generate_store_outreach,
    send_outreach_email,
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
        _graph = build_agent_graph(SHOPIFY_TOOLS, SHOPIFY_SYSTEM_PROMPT)
    return _graph


class ShopifyAgent:
    """
    Shopify Domain Agent (admin-side).
    Wraps the LangGraph ReAct graph with session memory management.
    """

    def __init__(self):
        self.memory = get_memory_store()
        self.graph = _get_graph()

    def invoke(self, session_id: str, message: str) -> dict:
        """
        Process a user message through the Shopify agent.

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
            "domain": "shopify",
            "context": {},
        }

        try:
            result = self.graph.invoke(state)
        except Exception as e:
            logger.error(f"Shopify Agent graph execution error: {e}", exc_info=True)
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
_shopify_agent = None


def get_shopify_agent() -> ShopifyAgent:
    global _shopify_agent
    if _shopify_agent is None:
        _shopify_agent = ShopifyAgent()
    return _shopify_agent
