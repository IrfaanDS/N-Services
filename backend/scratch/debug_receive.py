
import os
import uuid
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(url, key)

def test_receive():
    # Find a real business ID from common.businesses
    biz_res = supabase.schema("common").table("businesses").select("id, name, website_url").limit(1).execute()
    if not biz_res.data:
        print("No businesses found in common.businesses")
        return
    
    biz = biz_res.data[0]
    biz_id = biz["id"]
    print(f"Testing with business: {biz['name']} ({biz_id})")

    try:
        # Replicate receive_emails logic
        print("1. Checking lead...")
        lead_res = supabase.schema("b2b").table("leads").select("id").eq("id", biz_id).execute()
        
        if not lead_res.data:
            print("Lead not found, ensuring company exists...")
            comp_res = supabase.schema("b2b").table("companies").select("id").eq("business_id", biz_id).execute()
            if not comp_res.data:
                print("Company not found, inserting...")
                comp_data = {
                    "business_id": biz_id,
                    "industry": "Test",
                    "website_domain": "test.com"
                }
                comp_res = supabase.schema("b2b").table("companies").insert(comp_data).execute()
                print("Insert company result:", comp_res.data)
            
            if comp_res.data:
                comp_id = comp_res.data[0]["id"]
                print(f"Company ID: {comp_id}, inserting lead...")
                lead_data = {
                    "id": biz_id,
                    "company_id": comp_id,
                    "business_id": biz_id,
                    "full_name": biz["name"],
                    "email": "test@example.com",
                    "title": "Test Title",
                    "status": "new"
                }
                lead_res = supabase.schema("b2b").table("leads").insert(lead_data).execute()
                print("Insert lead result:", lead_res.data)

        print("2. Upserting into campaign_leads...")
        data = {
            "lead_id": biz_id,
            "target_email": "test@example.com",
            "subject": "Test Subject",
            "body": "Test Body",
            "status": "draft"
        }
        res = supabase.schema("outreach").table("b2b_campaign_leads").upsert(
            data, on_conflict="lead_id"
        ).execute()
        print("Upsert result:", res.data)

    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    test_receive()
