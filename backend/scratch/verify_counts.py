import asyncio
import os
from pathlib import Path
from dotenv import load_dotenv
from app.api.deps import get_supabase

async def test_counts():
    backend_root = Path("c:/Univeristy/FYP-2/N-Services/backend")
    load_dotenv(backend_root / ".env")
    load_dotenv(backend_root.parent / ".env")
    
    supabase = get_supabase()
    outreach_counts = {"sent": 0, "opened": 0, "replied": 0}
    
    local_res = supabase.schema("outreach").table("b2b_campaign_leads").select("sent_at,opened_at,replied_at").execute()
    for row in (local_res.data or []):
        if row.get("sent_at"):
            outreach_counts["sent"] += 1
        if row.get("opened_at"):
            outreach_counts["opened"] += 1
        if row.get("replied_at"):
            outreach_counts["replied"] += 1
    
    print(f"Counts: {outreach_counts}")

asyncio.run(test_counts())
