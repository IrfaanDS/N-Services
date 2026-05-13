"""
Agent Memory Management
───────────────────────
Abstract MemoryStore with an in-memory implementation.
Designed so a SupabaseStore can be swapped in later without touching agents.
"""
import time
import threading
from abc import ABC, abstractmethod
from typing import Optional
from langchain_core.messages import BaseMessage


class MemoryStore(ABC):
    """
    Abstract interface for agent session memory.
    Swap implementations (InMemory → Supabase) without modifying agent code.
    """

    @abstractmethod
    def get_history(self, session_id: str) -> list[BaseMessage]:
        """Return the full message history for a session."""
        ...

    @abstractmethod
    def save_history(self, session_id: str, messages: list[BaseMessage]) -> None:
        """Overwrite the stored history with the given messages."""
        ...

    @abstractmethod
    def clear(self, session_id: str) -> None:
        """Delete all messages for a session."""
        ...

    @abstractmethod
    def exists(self, session_id: str) -> bool:
        """Check if a session has any stored history."""
        ...


class InMemoryStore(MemoryStore):
    """
    Dict-backed memory store.  Fast, but lost on server restart.
    Sessions expire after `ttl_seconds` of inactivity (default: 2 hours).
    """

    def __init__(self, ttl_seconds: int = 7200):
        self._store: dict[str, list[BaseMessage]] = {}
        self._timestamps: dict[str, float] = {}
        self._ttl = ttl_seconds
        self._lock = threading.Lock()

    def get_history(self, session_id: str) -> list[BaseMessage]:
        with self._lock:
            self._cleanup_expired()
            self._timestamps[session_id] = time.time()
            return list(self._store.get(session_id, []))

    def save_history(self, session_id: str, messages: list[BaseMessage]) -> None:
        with self._lock:
            self._store[session_id] = list(messages)
            self._timestamps[session_id] = time.time()

    def clear(self, session_id: str) -> None:
        with self._lock:
            self._store.pop(session_id, None)
            self._timestamps.pop(session_id, None)

    def exists(self, session_id: str) -> bool:
        with self._lock:
            self._cleanup_expired()
            return session_id in self._store

    def _cleanup_expired(self) -> None:
        """Remove sessions that have been idle beyond the TTL."""
        now = time.time()
        expired = [
            sid for sid, ts in self._timestamps.items()
            if (now - ts) > self._ttl
        ]
        for sid in expired:
            self._store.pop(sid, None)
            self._timestamps.pop(sid, None)

    @property
    def active_sessions(self) -> int:
        with self._lock:
            self._cleanup_expired()
            return len(self._store)


# ── Singleton instance shared across all agents ──────────────────────────────
_global_memory = InMemoryStore()


def get_memory_store() -> MemoryStore:
    """Return the global memory store singleton."""
    return _global_memory
