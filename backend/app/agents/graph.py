"""
Shared ReAct Graph Builder
───────────────────────────
Constructs the LangGraph StateGraph used by all domain agents.
Uses the standard ReAct pattern: Reason → Act → Observe → loop.
Includes error handling for tool call failures from Groq.
"""
import logging
from langchain_core.messages import SystemMessage, AIMessage
from langchain_groq import ChatGroq
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode

from app.agents.state import AgentState
from app.core.config import get_settings

logger = logging.getLogger(__name__)

# Maximum iterations to prevent infinite loops
MAX_ITERATIONS = 8


def _get_llm():
    """Create a Groq Llama 3.3 70B client."""
    settings = get_settings()
    api_key = settings.GROQ_API_KEY
    if not api_key:
        raise ValueError("GROQ_API_KEY is not set. Add it to your .env file.")
    return ChatGroq(
        api_key=api_key,
        model="llama-3.3-70b-versatile",
        temperature=0.2,
        max_tokens=2048,
    )


def build_agent_graph(tools: list, system_prompt_template: str):
    """
    Build a compiled LangGraph StateGraph with the ReAct pattern.

    Args:
        tools: List of LangChain @tool functions for this domain.
        system_prompt_template: System prompt string with a {context} placeholder.

    Returns:
        A compiled graph that can be invoked with an AgentState dict.
    """
    llm = _get_llm()
    llm_with_tools = llm.bind_tools(tools)

    # ── Reason node ──────────────────────────────────────────────────────────
    def reason(state: AgentState) -> dict:
        """
        The LLM reasoning node. Reads messages + context, decides whether
        to call a tool or produce a final answer.
        """
        messages = state["messages"]
        context = state.get("context", {})

        # Inject system prompt with context as the first message
        rendered_prompt = system_prompt_template.format(
            context=_format_context(context)
        )

        # Build the full message list: system + conversation history
        full_messages = [SystemMessage(content=rendered_prompt)] + list(messages)

        try:
            response = llm_with_tools.invoke(full_messages)
        except Exception as e:
            error_msg = str(e)
            logger.warning(f"LLM tool-calling error, retrying without tools: {error_msg}")

            # If tool calling fails (e.g., Groq format error), retry without tools
            # to get a plain text response
            try:
                llm_plain = _get_llm()
                response = llm_plain.invoke(full_messages)
            except Exception as e2:
                logger.error(f"LLM fallback also failed: {e2}")
                response = AIMessage(
                    content="I'm having trouble processing your request right now. "
                    "Could you try rephrasing it? For example: "
                    "'Show me leads in Phoenix' or 'What are my dashboard stats?'"
                )

        return {"messages": [response]}

    # ── Routing function ─────────────────────────────────────────────────────
    def should_continue(state: AgentState) -> str:
        """Check the last message — if it has tool_calls, route to tools."""
        last_message = state["messages"][-1]

        # Count how many tool call round-trips we've done
        tool_rounds = sum(
            1 for m in state["messages"]
            if hasattr(m, "tool_calls") and m.tool_calls
        )
        if tool_rounds >= MAX_ITERATIONS:
            return END

        if hasattr(last_message, "tool_calls") and last_message.tool_calls:
            return "tools"
        return END

    # ── Build the graph ──────────────────────────────────────────────────────
    tool_node = ToolNode(tools)

    graph = StateGraph(AgentState)
    graph.add_node("reason", reason)
    graph.add_node("tools", tool_node)

    graph.set_entry_point("reason")
    graph.add_conditional_edges("reason", should_continue, {"tools": "tools", END: END})
    graph.add_edge("tools", "reason")

    return graph.compile()


def _format_context(context: dict) -> str:
    """Format a context dict into a readable string for the system prompt."""
    if not context:
        return "No live dashboard data available yet. Use the get_dashboard_stats tool to fetch current metrics."

    lines = []
    for key, value in context.items():
        if isinstance(value, dict):
            lines.append(f"**{key}:**")
            for k, v in value.items():
                lines.append(f"  - {k}: {v}")
        elif isinstance(value, list):
            lines.append(f"**{key}:** {', '.join(str(v) for v in value[:5])}")
        else:
            lines.append(f"**{key}:** {value}")
    return "\n".join(lines)
