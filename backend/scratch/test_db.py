import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
from pathlib import Path

# Load .env from root
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(PROJECT_ROOT / ".env")

POSTGRES_URL = os.getenv("POSTGRES_URL")
print(f"DEBUG: POSTGRES_URL: {POSTGRES_URL}")

if not POSTGRES_URL:
    print("ERROR: POSTGRES_URL not set")
    exit(1)

engine = create_engine(POSTGRES_URL)

try:
    with engine.connect() as conn:
        print("SUCCESS: Connected to database")
        
        # Check if shopify.lead_dashboard exists
        check_sql = """
            SELECT count(*) 
            FROM information_schema.tables 
            WHERE table_schema = 'shopify' AND table_name = 'lead_dashboard';
        """
        result = conn.execute(text(check_sql)).scalar()
        print(f"DEBUG: shopify.lead_dashboard exists: {result > 0}")
        
        if result > 0:
            # Describe the table
            desc_sql = """
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_schema = 'shopify' AND table_name = 'lead_dashboard';
            """
            columns = conn.execute(text(desc_sql)).fetchall()
            print("DEBUG: Columns in shopify.lead_dashboard:")
            for col in columns:
                print(f"  - {col[0]} ({col[1]})")
            
            # Try a sample query
            sample_sql = "SELECT * FROM shopify.lead_dashboard LIMIT 1"
            sample = conn.execute(text(sample_sql)).mappings().first()
            print(f"DEBUG: Sample row: {sample}")
        else:
            print("ERROR: shopify.lead_dashboard table/view NOT FOUND")

except Exception as e:
    print(f"ERROR: {e}")
