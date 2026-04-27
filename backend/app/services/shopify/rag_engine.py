"""
Vectorless RAG Engine for the Shopify RAG Platform.
Handles relevance guard, memory refinement, intent routing,
weighted context retrieval, and response generation via Groq API.

This is the multi-tenant version: all store-specific data is passed in
via the StoreData object — no globals.

Cart Architecture:
  The agent identifies cart intent and emits structured `action` payloads.
  The FRONTEND executes these actions by calling the live Shopify AJAX API
  using the user's real browser session — so the cart lives on Shopify, not us.

Performance Architecture (Hybrid Speed):
  - Product search is performed at the DATABASE level via MongoDB $text index
    instead of loading all products into Python memory.
  - Follow-up queries ("does it come in blue?") are answered from session-
    pinned active products, skipping DB search entirely.
  - Classification and search run in PARALLEL via asyncio.gather().
"""

import asyncio
import json
import logging
import re
from groq import AsyncGroq

from .config import (
    GROQ_API_KEY,
    GROQ_MODEL,
    GROQ_TEMPERATURE,
    MAX_PRODUCT_MATCHES,
    CLASSIFIER_PROMPT_TEMPLATE,
    ASSISTANT_SYSTEM_PROMPT_TEMPLATE,
)

from .memory_manager import ConversationSession
from .store_manager import StoreData, MongoDBStoreManager

logger = logging.getLogger(__name__)

# ── Follow-up Detection Patterns ──────────────────────────────────────────────
# Regex follow-up patterns removed in favor of intelligent LLM Memory Refiner.

# ── Tool Definitions (Groq Tool Calling Schema) ───────────────────────────────
# These tools are sent to Groq with every assistant request.
# When the LLM decides to use one, we extract the args and build an `action`
# payload for the frontend — we do NOT execute the cart action server-side.
AGENT_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "add_to_cart",
            "description": (
                "Add a specific product to the user's shopping cart. "
                "Use this ONLY when the user explicitly says they want to buy, "
                "add, or order a product. Resolve the product name to the "
                "best match in the provided context."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "product_name": {
                        "type": "string",
                        "description": "Exact product name as it appears in the context."
                    },
                    "quantity": {
                        "type": "integer",
                        "description": "Number of units to add. Defaults to 1.",
                        "default": 1
                    }
                },
                "required": ["product_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "checkout",
            "description": (
                "Initiate checkout for the user. Use this when the user says "
                "they are ready to pay, checkout, or complete their order."
            ),
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    }
]

# ── Groq Client (shared across all stores) ────────────────────────────────────
_groq_client: AsyncGroq | None = None


def _get_groq_client() -> AsyncGroq:
    """Lazy-init the Groq client."""
    global _groq_client
    if _groq_client is None:
        if not GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY is not set. Add it to your .env file.")
        _groq_client = AsyncGroq(api_key=GROQ_API_KEY)
    return _groq_client


async def get_groq_completion(
    system_prompt: str,
    user_query: str,
    model: str = None,
    temperature: float = None,
    json_mode: bool = False,
    messages: list = None,
    use_tools: bool = False,
):
    """
    Helper to handle Groq API calls (Async).
    - json_mode=True  → returns a plain string (JSON-formatted)
    - use_tools=True  → returns the raw message object so callers can
                        inspect tool_calls.
    - messages        → pass a full history list instead of a one-shot prompt
    """
    client = _get_groq_client()

    # Model-specific tool calling adjustments
    target_model = model or GROQ_MODEL
    
    if messages is None:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_query},
        ]

    # If using tools, we need to ensure the system prompt doesn't conflict with tool calling.
    # We also add a small hint for Llama models to use the native tool calling schema.
    if use_tools:
        # Check if the system message exists and modify it
        for msg in messages:
            if msg.get("role") == "system":
                content = msg.get("content", "")
                
                # Only modify if we haven't already added the tool rules
                if content and "TOOL USE RULES:" not in content:
                    # Relax the "ONLY valid, raw JSON" if it exists, as it breaks tool calling
                    relaxed_content = content.replace(
                        "You MUST respond with ONLY valid, raw JSON.",
                        "Respond with valid JSON for your final text reply. However, if you need to call a tool, do so first."
                    )
                    # Add tool use hint
                    msg["content"] = (
                        f"{relaxed_content}\n\n"
                        "TOOL USE RULES:\n"
                        "- If the user wants to buy/add/order a product, use the `add_to_cart` tool.\n"
                        "- If the user wants to checkout, use the `checkout` tool.\n"
                        "- When calling a tool, do NOT provide a conversational text response in the same turn. "
                        "Wait for the tool result to compose your final response."
                    )

    kwargs = {
        "messages": messages,
        "model": target_model,
        "temperature": temperature if temperature is not None else GROQ_TEMPERATURE,
    }

    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    if use_tools:
        kwargs["tools"] = AGENT_TOOLS
        kwargs["tool_choice"] = "auto"

    try:
        chat_completion = await client.chat.completions.create(**kwargs)
        msg = chat_completion.choices[0].message

        if use_tools:
            return msg  # caller inspects msg.tool_calls
        return msg.content.strip() if msg.content else ""
    except Exception as e:
        logger.error(f"Groq API Error: {e}")
        raise


# ══════════════════════════════════════════════════════════════════════════════
#  HELPER — format product dicts into a context string for the LLM
# ══════════════════════════════════════════════════════════════════════════════

def _build_product_context(products: list[dict]) -> str:
    """Build the text context block from a list of product dicts."""
    if not products:
        return "GENERAL_GUIDANCE"

    blocks = []
    for p in products:
        block = (
            f"Product Name: {p.get('product_name', '')}\n"
            f"Attributes: {p.get('full_context', '')}\n"
            f"URL: {p.get('url', '')}\n"
        )
        blocks.append(block)
    return "\n---\n".join(blocks)


# ══════════════════════════════════════════════════════════════════════════════
#  RAG PIPELINE — store-aware hybrid version
# ══════════════════════════════════════════════════════════════════════════════

async def run_rag_pipeline(
    user_query: str,
    session: ConversationSession,
    store: StoreData,
    store_manager: MongoDBStoreManager,
) -> dict:

    """
    Main RAG pipeline — multi-tenant hybrid-speed version.

    Pipeline:
        1. Memory Refiner — refine query using chat history
        2. Follow-up Check — skip search if asking about active products
        3. Relevance Guard + Intent Router — classify (runs in PARALLEL with search)
        4. Context Retrieval — MongoDB $text search (DB-level, not Python)
        5. Product Pinning — cache results in session for follow-ups
        6. Response Generation — Groq LLM with full context

    Returns:
        dict with keys: response, intent, session_id
    """

    brand_name = store.brand_name

    # ─────────────────────────────────────────────────────
    # STEP 0.5 & 1: INTELLIGENT MEMORY REFINER & FOLLOW-UP
    # ─────────────────────────────────────────────────────
    chat_history = session.get_messages_for_api()
    active_products = session.get_active_products()
    is_followup = False
    
    if chat_history:
        memory_context = "\n".join(
            [f"{m['role']}: {m['content']}" for m in chat_history[-4:]]
        )
        refine_prompt = (
            f"Conversation History:\n{memory_context}\n\n"
            f"User's Latest Query:\n\"{user_query}\"\n\n"
            f"Task 1: Is the user asking a follow-up question perfectly matching the CURRENT product(s) being discussed "
            f"(e.g., 'how much is it', 'what colors', 'tell me more', 'buy it'), OR are they looking for a NEW/different product "
            f"(e.g., 'what about dresses', 'show me red shirts', 'I want something else')?\n"
            f"Task 2: Extract a robust `search_query` string for the database. IMPORTANT: If they mention a specific product "
            f"(e.g. 'blue shirt'), use exactly those keywords. If they give a descriptive/vague query (e.g. 'wedding outfit', 'warm stuff'), "
            f"expand the query with 3-5 synonymous e-commerce keywords (e.g. 'wedding formal dress suit gown').\n"
            f"Exclude conversational filler like 'Here is the query'.\n\n"
            f"Return ONLY a strictly valid JSON object:\n"
            f"{{\n"
            f"  \"is_followup\": boolean,\n"
            f"  \"search_query\": \"clean expanded keywords\"\n"
            f"}}"
        )
        
        try:
            refine_response = await get_groq_completion(
                "You are an expert semantic search query generator. Respond ONLY in valid JSON.", 
                refine_prompt,
                json_mode=True,
                temperature=0.1
            )
            parsed_refine = json.loads(refine_response)
            search_query = parsed_refine.get("search_query", user_query).strip() or user_query
            
            # Only trust `is_followup` if we actually have products pinned
            is_followup = bool(parsed_refine.get("is_followup", False)) and len(active_products) > 0
            
            logger.info(f"🔧 [{store.store_id}] Refiner JSON: {json.dumps(parsed_refine)}")
            if is_followup:
                logger.info(f"⚡ [{store.store_id}] Follow-up detected by LLM — skipping DB search.")
        except Exception as e:
            logger.warning(f"Memory refiner failed: {e}. Defaulting to literal query.")
            search_query = user_query
    else:
        search_query = user_query


    # ─────────────────────────────────────────────────────
    # STEP 2: CLASSIFICATION + SEARCH (parallel)
    # ─────────────────────────────────────────────────────
    # Run classification and product search concurrently for speed.
    # If this is a follow-up, skip the DB search entirely.

    classifier_prompt = CLASSIFIER_PROMPT_TEMPLATE.format(brand_name=brand_name)

    async def _classify():
        try:
            raw = await get_groq_completion(classifier_prompt, search_query, temperature=0, json_mode=True)
            return json.loads(raw)
        except Exception as e:
            logger.warning(f"Classification failed: {e}. Defaulting to relevant/PRODUCT.")
            return {"is_relevant": True, "intent": "PRODUCT"}

    async def _search():
        if is_followup:
            return active_products  # instant — no DB hit
        return await store_manager.search_products(store.store_id, search_query)

    # Fire both at the same time
    classification, search_results = await asyncio.gather(_classify(), _search())

    is_relevant = classification.get("is_relevant", True)
    intent = classification.get("intent", "PRODUCT")

    logger.info(f"🛡️ [{store.store_id}] Relevant: {is_relevant} | Intent: {intent} | Products found: {len(search_results)}")

    if not is_relevant:
        off_topic_response = (
            f"I'm your {brand_name} assistant! I can help you find products, "
            f"answer questions about our catalog, or look into store policies. "
            f"What can I help you with?"
        )
        session.add_user_message(user_query)
        session.add_assistant_message(off_topic_response)
        return {
            "response": off_topic_response,
            "intent": "OFF_TOPIC",
            "session_id": session.session_id,
        }


    # ─────────────────────────────────────────────────────
    # STEP 3: CONTEXT BUILDING
    # ─────────────────────────────────────────────────────
    context = ""

    if intent == "PRODUCT":
        context = _build_product_context(search_results)

        # Pin these products to session for future follow-ups
        if search_results and not is_followup:
            session.set_active_products(search_results)

    elif intent in ("DETAILS", "FABRIC"):
        # Support both DETAILS (new generic) and FABRIC (legacy) intents
        details = store.store_map.get("fabric_guide", {})
        details.update(store.store_map.get("product_details", {}))
        context = json.dumps(details) if details else "Please check individual product pages for detailed specifications."

    elif intent == "POLICY":
        context = json.dumps(store.store_map.get("policies", {}))

    elif intent in ("GREETING", "About_brand"):
        brand_info = store.store_map.get("brand_info", {})
        if brand_info:
            context = (
                f"{brand_name} — {brand_info.get('mission', f'{brand_name} is a quality brand.')} "
                f"Tagline: {brand_info.get('tagline', '')}. "
                f"Values: {brand_info.get('values', '')}."
            )
        else:
            context = f"{brand_name} — your go-to destination for quality products."

    # ─────────────────────────────────────────────────────
    # STEP 4: TOOL-AWARE RESPONSE GENERATION
    # ─────────────────────────────────────────────────────
    history_text = session.get_history_text()
    system_prompt = ASSISTANT_SYSTEM_PROMPT_TEMPLATE.format(
        brand_name=brand_name,
        specialist_title=store.specialist_title,
        sign_off=store.sign_off,
        context=context,
        history=history_text,
    )

    # Build the message list for the tool loop
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_query},
    ]

    # action_payload is what we send to the frontend so it can call
    # the live Shopify AJAX API using the user's real browser cookies
    action_payload = None
    response_text = None

    # Allow up to 3 rounds of tool calling (usually just 1)
    for _ in range(3):
        msg = await get_groq_completion(
            system_prompt, user_query, messages=messages, use_tools=True
        )

        if not msg.tool_calls:
            # No tool call → this is the final text response
            response_text = msg.content or ""
            break

        # Append assistant tool-call message to history. 
        # Manual dict conversion avoids Pydantic 'by_alias' serialization bugs in some environments.
        assistant_msg = {
            "role": "assistant",
            "content": msg.content,
        }
        if msg.tool_calls:
            assistant_msg["tool_calls"] = [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {
                        "name": tc.function.name,
                        "arguments": tc.function.arguments,
                    }
                } for tc in msg.tool_calls
            ]
        messages.append(assistant_msg)

        # Process every tool call the model made
        for tc in msg.tool_calls:
            fn_name = tc.function.name
            args = json.loads(tc.function.arguments) if tc.function.arguments else {}
            logger.info(f"🛠️  [{store.store_id}] Tool call: {fn_name}({args})")

            tool_result_str = ""

            # ── add_to_cart ───────────────────────────────────────────────────
            if fn_name == "add_to_cart":
                p_name = args.get("product_name", "")
                qty = int(args.get("quantity", 1))

                # Search active products first, then DB
                matched = None

                # Check session-pinned products first (instant)
                for p in session.get_active_products():
                    if p_name.lower() in p["product_name"].lower():
                        matched = p
                        break

                # Fall back to a targeted DB search
                if not matched:
                    db_results = await store_manager.search_products(
                        store.store_id, p_name, limit=1
                    )
                    if db_results:
                        matched = db_results[0]

                if matched:
                    variant_id = matched.get("id")  # Shopify variant/product ID
                    # Extract price string from full_context e.g. "Price: $39.00"
                    price_match = re.search(r"Price:\s*\$?([\d.,]+)", matched.get("full_context", ""))
                    price_str = f"${price_match.group(1)}" if price_match else ""

                    action_payload = {
                        "type": "add_to_cart",
                        "variant_id": variant_id,
                        "quantity": qty,
                        "product_name": matched["product_name"],
                        "price": price_str,
                        "image": matched.get("image", ""),
                        "url": matched.get("url", ""),
                    }
                    tool_result_str = (
                        f"Action queued: add {qty}x '{matched['product_name']}' "
                        f"(variant_id={variant_id}) to the Shopify cart."
                    )
                else:
                    tool_result_str = (
                        f"Could not find a product matching '{p_name}' in the catalog."
                    )

            # ── checkout ─────────────────────────────────────────────────────
            elif fn_name == "checkout":
                action_payload = {
                    "type": "checkout",
                    "url": f"https://{store.domain}/checkout",
                }
                tool_result_str = "Checkout action queued. Redirecting user to checkout."

            # Append tool result so the LLM can compose its reply
            messages.append({
                "role": "tool",
                "tool_call_id": tc.id,
                "name": fn_name,
                "content": tool_result_str,
            })

    # If the loop exhausted without a text response, do one final call
    # (without tools so it's forced to produce text)
    if response_text is None:
        response_text = await get_groq_completion(
            system_prompt, user_query, messages=messages, json_mode=True
        )

    # Ensure the response is valid JSON matching ASSISTANT_SYSTEM_PROMPT_TEMPLATE
    # The model should already return JSON, but guard against plain text fallback
    try:
        json.loads(response_text)   # validate — if it parses, all good
    except (json.JSONDecodeError, TypeError):
        # Wrap plain text in the expected schema
        response_text = json.dumps({"text": str(response_text).strip(), "products": []})

    # Update session memory
    session.add_user_message(user_query)
    session.add_assistant_message(response_text)

    result = {
        "response": response_text,
        "intent": intent,
        "session_id": session.session_id,
    }
    if action_payload:
        result["action"] = action_payload

    return result
