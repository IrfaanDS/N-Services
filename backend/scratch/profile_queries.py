import os
import time
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# Load .env from root
dotenv_path = Path("c:/Univeristy/FYP-2/N-Services/.env")
load_dotenv(dotenv_path)
pg_url = os.getenv("POSTGRES_URL", "")

if not pg_url:
    print(f"No POSTGRES_URL found at {dotenv_path}")
    exit(1)

engine = create_engine(pg_url)

start_all = time.time()
with engine.connect() as conn:
    print(f"Connection time: {time.time() - start_all:.2f}s")
    
    start = time.time()
    agg_sql = """
        SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE LOWER(tier) = 'hot') as hot,
            COUNT(*) FILTER (WHERE LOWER(tier) = 'warm') as warm,
            COUNT(*) FILTER (WHERE LOWER(tier) = 'cold') as cold,
            COUNT(*) FILTER (WHERE assistant_created = true OR has_ai_assistant = true) as assistants,
            COALESCE(ROUND(AVG(lead_score)::numeric, 1), 0) as avg_score
        FROM shopify.lead_dashboard
    """
    conn.execute(text(agg_sql)).mappings().first()
    print(f"Agg query: {time.time() - start:.2f}s")
    
    start = time.time()
    niche_sql = "SELECT niche, COUNT(*) as cnt FROM shopify.lead_dashboard WHERE niche IS NOT NULL GROUP BY niche ORDER BY cnt DESC LIMIT 6"
    conn.execute(text(niche_sql)).mappings().all()
    print(f"Niche query: {time.time() - start:.2f}s")
    
    start = time.time()
    recent_sql = "SELECT name, tier, created_at FROM shopify.lead_dashboard ORDER BY created_at DESC LIMIT 5"
    conn.execute(text(recent_sql)).mappings().all()
    print(f"Recent query: {time.time() - start:.2f}s")
print(f"Total time: {time.time() - start_all:.2f}s")
