import os
import logging
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO)

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

# A sample SEO business ID (from my previous check)
lead_id = "6ac8742f-cd21-47ec-8c2e-be510eb77a73"
email = "test@example.com"
subject = "Test SEO Subject"
body = "Test SEO Body"

print(f"Attempting to receive email for lead {lead_id}...")

try:
    # 1. Check if lead exists in b2b.leads
    lead_res = supabase.schema("b2b").table("leads").select("id").eq("id", lead_id).execute()
    print(f"Lead in b2b.leads: {lead_res.data}")
    
    if not lead_res.data:
        # 2. Find in common.businesses
        biz_res = supabase.schema("common").table("businesses").select("*").eq("id", lead_id).execute()
        print(f"Biz in common.businesses: {biz_res.data}")
        
        if biz_res.data:
            biz = biz_res.data[0]
            # 3. Ensure company exists in b2b.companies
            comp_res = supabase.schema("b2b").table("companies").select("id").eq("business_id", lead_id).execute()
            print(f"Comp in b2b.companies: {comp_res.data}")
            
            if not comp_res.data:
                comp_data = {
                    "business_id": lead_id,
                    "industry": biz.get("niche") or "SEO",
                    "website_domain": "test.com"
                }
                comp_res = supabase.schema("b2b").table("companies").insert(comp_data).execute()
                print(f"Created company: {comp_res.data}")
            
            if comp_res.data:
                comp_id = comp_res.data[0]["id"]
                # 4. Create lead entry
                lead_data = {
                    "id": lead_id,
                    "company_id": comp_id,
                    "business_id": lead_id,
                    "full_name": biz.get("name") or "Lead",
                    "email": email,
                    "title": "Owner/Manager",
                    "status": "new"
                }
                lead_ins = supabase.schema("b2b").table("leads").insert(lead_data).execute()
                print(f"Created lead: {lead_ins.data}")

    # 5. Upsert into outreach.b2b_campaign_leads
    data = {
        "lead_id": lead_id,
        "target_email": email,
        "subject": subject,
        "body": body,
        "status": "draft"
    }
    print(f"Upserting into b2b_campaign_leads...")
    # Using insert as fallback if upsert fails
    try:
        res = supabase.schema("outreach").table("b2b_campaign_leads").upsert(data, on_conflict="lead_id").execute()
        print(f"Upsert result: {res.data}")
    except Exception as e:
        print(f"Upsert failed: {e}")
        print("Trying insert instead...")
        res = supabase.schema("outreach").table("b2b_campaign_leads").insert(data).execute()
        print(f"Insert result: {res.data}")

except Exception as e:
    print(f"CRITICAL ERROR: {e}")
