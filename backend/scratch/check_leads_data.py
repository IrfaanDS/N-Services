import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

try:
    res = supabase.table("businesses").select("*", count="exact").limit(5).execute()
    print(f"Total businesses: {res.count}")
    print(f"Sample data: {res.data}")
except Exception as e:
    print(f"Error checking businesses table: {e}")

try:
    res = supabase.table("business_contacts").select("*").limit(1).execute()
    print(f"Business contacts sample: {res.data}")
except Exception as e:
    print(f"Error checking business_contacts table: {e}")
