"""
Shared Dependencies
───────────────────
Dependency injection for FastAPI routes.
Provides: Supabase client, current user, settings.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
from app.core.config import get_settings, Settings

security = HTTPBearer(auto_error=False)

# ── Singleton Supabase client ──
_supabase_client: Client | None = None


def get_supabase() -> Client:
    """
    Return a singleton Supabase client using the service role key.
    Service role bypasses RLS for server-side operations.
    """
    global _supabase_client
    if _supabase_client is None:
        settings = get_settings()
        _supabase_client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_ROLE_KEY,
        )
    return _supabase_client


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
):
    """
    Extract and verify JWT from Authorization header.
    Returns user dict from the users table.
    For now, returns a placeholder — will be implemented with auth.
    """
    # TODO: Implement JWT verification
    return {"id": None, "email": None, "plan": "free"}
