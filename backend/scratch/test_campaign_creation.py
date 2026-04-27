import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

account_id = "feefa1cd-33fc-4a1b-8823-306b9990bcda"
business_ids = ['a4dd3445-1de0-4162-a316-f32cefbfe714', 'ee5c421d-3441-45e5-88b9-c850fd8125c8']

camp_data = {
    "name": "Test Campaign",
    "account_id": account_id,
    "status": "Running",
    "total_leads": len(business_ids),
    "send_rate": 5
}

try:
    print("Attempting to create campaign...")
    camp_res = supabase.schema("outreach").table("b2b_campaigns").insert(camp_data).execute()
    if not camp_res.data:
        print("Error: No data returned from insert")
    else:
        campaign_id = camp_res.data[0]["id"]
        print(f"Success! Campaign created with ID: {campaign_id}")
        
        # Cleanup
        print(f"Deleting test campaign {campaign_id}...")
        supabase.schema("outreach").table("b2b_campaigns").delete().eq("id", campaign_id).execute()
        print("Cleanup done.")
except Exception as e:
    print(f"FAILED: {e}")
