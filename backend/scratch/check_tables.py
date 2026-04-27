import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

def check_table(schema, table):
    try:
        res = supabase.schema(schema).table(table).select("*", count="exact").limit(0).execute()
        print(f"OK: Table {schema}.{table} exists. Count: {res.count}")
    except Exception as e:
        print(f"ERROR: Table {schema}.{table} error: {e}")

print("Checking tables...")
check_table("outreach", "b2b_sending_accounts")
check_table("outreach", "b2b_campaign_leads")
check_table("outreach", "b2b_campaigns")
check_table("b2b", "leads")
check_table("b2b", "companies")
check_table("common", "businesses")
