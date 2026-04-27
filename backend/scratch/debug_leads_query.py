import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

try:
    print("Testing basic select from common.businesses...")
    res = supabase.schema("common").table("businesses").select("id, name", count="exact").limit(5).execute()
    print(f"Total: {res.count}")
    print(f"Data: {res.data}")

    print("\nTesting join with contacts...")
    res_join = supabase.schema("common").table("businesses").select(
        "id, name, contacts(email, phone)", count="exact"
    ).limit(5).execute()
    print(f"Total: {res_join.count}")
    print(f"Data (first 2): {res_join.data[:2]}")
except Exception as e:
    print(f"Error: {e}")
