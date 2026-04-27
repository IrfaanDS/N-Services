import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

res = supabase.schema("outreach").table("b2b_sending_accounts").select("*").execute()
for acc in (res.data or []):
    print(f"ID: {acc['id']}, Name: {acc['name']}, User: {acc['smtp_user']}")
