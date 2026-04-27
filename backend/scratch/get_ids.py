import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

acc_res = supabase.schema("outreach").table("b2b_sending_accounts").select("id").execute()
if acc_res.data:
    print(f"Account ID: {acc_res.data[0]['id']}")

leads_res = supabase.schema("outreach").table("b2b_campaign_leads").select("lead_id").execute()
if leads_res.data:
    print(f"Lead IDs: {[l['lead_id'] for l in leads_res.data]}")
