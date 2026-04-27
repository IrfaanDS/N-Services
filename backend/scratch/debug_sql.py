import os
import time
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# Load .env
backend_root = Path(__file__).resolve().parent
load_dotenv(backend_root / ".env")
load_dotenv(backend_root.parent / ".env")
pg_url = os.getenv("POSTGRES_URL", "")

print(f"PG_URL length: {len(pg_url) if pg_url else 0}")

if not pg_url:
    print("No POSTGRES_URL found")
    exit(1)

start = time.time()
try:
    engine = create_engine(pg_url)
    with engine.connect() as conn:
        print(f"Connected in {time.time() - start:.2f}s")
        res = conn.execute(text("SELECT COUNT(*) FROM shopify.lead_dashboard")).scalar()
        print(f"Count: {res} (Total time: {time.time() - start:.2f}s)")
except Exception as e:
    print(f"Error: {e}")
