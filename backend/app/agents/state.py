"""
Agent State Schema
──────────────────
Defines the shared state TypedDict used by all LangGraph domain agents.
"""
from typing import Annotated, Any
from typing_extensions import TypedDict
from langgraph.graph.message import add_messages
from langchain_core.messages import AnyMessage


class AgentState(TypedDict):
    """
    Shared state flowing through every node of the ReAct graph.

    Fields:
        messages:  Full conversation history (user + assistant + tool messages).
                   The `add_messages` reducer appends new messages automatically.
        domain:    Which module this agent belongs to ("seo" | "b2b" | "shopify").
        context:   Dashboard snapshot injected once at session start. Gives the
                   LLM situational awareness of the current state of the platform.
    """
    messages: Annotated[list[AnyMessage], add_messages]
    domain: str
    context: dict
