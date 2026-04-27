import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

try:
    print("Testing joined query...")
    query = supabase.table("businesses").select(
        "id, name, website_url, niche, city, country, created_at, "
        "business_contacts(email, phone, linkedin, instagram, facebook)"
    )
    res = query.limit(5).execute()
    print(f"Success! Data: {res.data}")
except Exception as e:
    print(f"Join query failed: {e}")

try:
    print("\nTesting filters query...")
    niches_result = supabase.table("businesses").select("niche").execute()
    print(f"Niches count: {len(niches_result.data)}")
except Exception as e:
    print(f"Filters query failed: {e}")
