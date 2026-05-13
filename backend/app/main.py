from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import leads, evaluation, emails, sending, dashboard, auth, onebox, seo_assistant
from app.api.routes import b2b_leads, b2b_emails, b2b_agent
from app.api.routes import shopify, shopify_leads
from app.api.routes import stripe_routes

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize Shopify MongoDB indexes
    from app.api.routes.shopify import store_manager
    try:
        await store_manager.ensure_indexes()
    except Exception as e:
        print(f"⚠️ Shopify Init Error: {e}")
    yield

app = FastAPI(
    title="N-Services Platform API",
    description="Lead acquisition, evaluation, email generation & sending platform for SEO and B2B services",
    version="2.0.0",
    lifespan=lifespan,
)

# ── CORS (allow React dev server) ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register SEO route modules ──
app.include_router(auth.router,       prefix="/api/auth",       tags=["Auth"])
app.include_router(stripe_routes.router, prefix="/api",         tags=["Stripe"])
app.include_router(leads.router,      prefix="/api/leads",      tags=["Lead Acquisition"])
app.include_router(evaluation.router, prefix="/api/evaluate",   tags=["Lead Evaluation"])
app.include_router(emails.router,     prefix="/api/emails",     tags=["Email Generation"])
app.include_router(sending.router,    prefix="/api/campaigns",  tags=["Email Sending"])
app.include_router(onebox.router,     prefix="/api/onebox",     tags=["Onebox"])
app.include_router(dashboard.router,       prefix="/api/dashboard",    tags=["Dashboard"])
app.include_router(seo_assistant.router,   prefix="/api/assistant",    tags=["SEO Assistant"])

# ── Register B2B route modules ──
app.include_router(b2b_leads.router,  prefix="/api/b2b/leads",  tags=["B2B Lead Acquisition"])
app.include_router(b2b_emails.router, prefix="/api/b2b/emails", tags=["B2B Email Generation"])
app.include_router(b2b_agent.router, prefix="/api/b2b/agent", tags=["B2B Agent"])

# ── Register Shopify RAG modules ──
app.include_router(shopify.router, prefix="/api/shopify", tags=["Shopify AI"])


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "n-services-platform", "version": "2.0.0"}
