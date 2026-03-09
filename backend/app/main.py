from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import leads, evaluation, emails, sending, dashboard, auth

app = FastAPI(
    title="LeadFlow SEO API",
    description="Lead acquisition, evaluation, email generation & sending platform for SEO services",
    version="1.0.0",
)

# ── CORS (allow React dev server) ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register route modules ──
app.include_router(auth.router,       prefix="/api/auth",       tags=["Auth"])
app.include_router(leads.router,      prefix="/api/leads",      tags=["Lead Acquisition"])
app.include_router(evaluation.router, prefix="/api/evaluate",   tags=["Lead Evaluation"])
app.include_router(emails.router,     prefix="/api/emails",     tags=["Email Generation"])
app.include_router(sending.router,    prefix="/api/campaigns",  tags=["Email Sending"])
app.include_router(dashboard.router,  prefix="/api/dashboard",  tags=["Dashboard"])


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "leadflow-seo"}
