import os
import requests
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}",
    "Accept": "application/vnd.pgrst.plan+json", # Just to check existence/structure
}

# Use SQL via RPC if possible, or just query information_schema
def run_sql(sql):
    # Supabase doesn't expose a raw SQL endpoint via PostgREST by default, 
    # but we can try to query information_schema.columns if it's exposed.
    # Actually, most Supabase setups don't expose it.
    pass

# Let's just use the python client to list columns from a row
from supabase import create_client
supabase = create_client(url, key)
res = supabase.schema("outreach").table("b2b_sending_accounts").select("*").limit(1).execute()
if res.data:
    print(f"Columns: {list(res.data[0].keys())}")
else:
    print("No data in table to check columns.")
