"""
Application Configuration
─────────────────────────
Loads environment variables for Supabase, Redis, JWT, and ReachInbox.
Uses pydantic-settings for validation.
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # ── Supabase ──
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""

    # ── Redis ──
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── JWT ──
    JWT_SECRET: str = "change-this-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # ── ReachInbox ──
    REACHINBOX_API_KEY: str = ""
    REACHINBOX_BASE_URL: str = "https://api.reachinbox.ai/api/v1"

    # ── Groq API ──
    GROQ_API_KEY: str = ""

    # ── Smythos B2B Email Agent ──
    SMYTHOS_API_URL: str = "https://cmlzhionm4k7g7uvzbjzk4yft.agent.a.smyth.ai/api/generate_sequences"

    # ── App ──
    DEBUG: bool = True
    FRONTEND_URL: str = "http://localhost:5173"

    # ── Stripe ──
    STRIPE_SECRET_KEY: str = ""
    STRIPE_PUBLISHABLE_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""

    # ── Tier Prices (Sandbox IDs) ──
    # These should be set in .env after creating them in Stripe dashboard
    STRIPE_PRICE_BASIC: str = ""
    STRIPE_PRICE_PRO: str = ""
    STRIPE_PRICE_PREMIUM: str = ""

    model_config = {
        "env_file": ("../.env", ".env"),
        "extra": "allow"
    }


@lru_cache()
def get_settings() -> Settings:
    return Settings()
