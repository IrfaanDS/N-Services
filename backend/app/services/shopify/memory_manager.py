"""
Session-based conversation memory manager.
Stores chat history per session_id in-memory with TTL-based expiration.

This module is store-agnostic — sessions are keyed by UUID and each session
naturally contains only one store's conversation.
"""

import time
import uuid
from typing import Optional
from .config import MAX_CONVERSATION_TURNS, SESSION_TTL_MINUTES


class ConversationSession:
    """Represents a single user's conversation session."""

    def __init__(self, session_id: str):
        self.session_id = session_id
        self.messages: list[dict] = []  # List of {"role": "user"|"assistant", "content": "..."}
        self.created_at = time.time()
        self.last_activity = time.time()

        # ── Active Product Cache ──────────────────────────────────────────
        # Stores the product dicts returned in the last PRODUCT response.
        # Used to answer follow-up questions instantly without re-searching.
        self.active_products: list[dict] = []

    def add_user_message(self, content: str):
        """Record a user message."""
        self.messages.append({"role": "user", "content": content})
        self.last_activity = time.time()
        self._trim()

    def add_assistant_message(self, content: str):
        """Record an assistant response."""
        self.messages.append({"role": "assistant", "content": content})
        self.last_activity = time.time()
        self._trim()

    def get_history_text(self) -> str:
        """
        Return the conversation history as a readable string
        suitable for injecting into the system prompt.
        """
        if not self.messages:
            return "No previous conversation."

        lines = []
        for msg in self.messages:
            prefix = "Customer" if msg["role"] == "user" else "Assistant"
            lines.append(f"{prefix}: {msg['content']}")
        return "\n".join(lines)

    def get_messages_for_api(self) -> list[dict]:
        """
        Return the conversation history formatted for the Groq API
        messages array (role/content dicts).
        """
        return list(self.messages)

    def set_active_products(self, products: list[dict]):
        """Pin the products from the last search result to this session."""
        self.active_products = products[:10]  # keep at most 10
        self.last_activity = time.time()

    def get_active_products(self) -> list[dict]:
        """Return the pinned active products (empty if none)."""
        return self.active_products

    def is_expired(self) -> bool:
        """Check if the session has exceeded its TTL."""
        return (time.time() - self.last_activity) > (SESSION_TTL_MINUTES * 60)

    def _trim(self):
        """Keep only the last N turns to avoid token overflow."""
        max_messages = MAX_CONVERSATION_TURNS * 2  # each turn = user + assistant
        if len(self.messages) > max_messages:
            self.messages = self.messages[-max_messages:]


class MemoryManager:
    """
    In-memory store for all active conversation sessions.
    Provides create / get / cleanup operations.
    """

    def __init__(self):
        self._sessions: dict[str, ConversationSession] = {}

    def create_session(self) -> str:
        """Create a new session and return its ID."""
        session_id = str(uuid.uuid4())
        self._sessions[session_id] = ConversationSession(session_id)
        return session_id

    def get_session(self, session_id: str) -> Optional[ConversationSession]:
        """
        Retrieve a session by ID.
        Returns None if not found or expired (auto-cleans expired sessions).
        """
        session = self._sessions.get(session_id)
        if session is None:
            return None
        if session.is_expired():
            del self._sessions[session_id]
            return None
        return session

    def get_or_create_session(self, session_id: Optional[str] = None) -> tuple[str, ConversationSession]:
        """
        Convenience: get an existing session or create a new one.
        Returns (session_id, session).
        """
        if session_id:
            session = self.get_session(session_id)
            if session:
                return session_id, session

        # Create new
        new_id = self.create_session()
        return new_id, self._sessions[new_id]

    def delete_session(self, session_id: str) -> bool:
        """Delete a session. Returns True if it existed."""
        if session_id in self._sessions:
            del self._sessions[session_id]
            return True
        return False

    def cleanup_expired(self):
        """Remove all expired sessions. Call periodically."""
        expired = [sid for sid, s in self._sessions.items() if s.is_expired()]
        for sid in expired:
            del self._sessions[sid]

    @property
    def active_session_count(self) -> int:
        return len(self._sessions)
