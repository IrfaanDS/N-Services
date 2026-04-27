import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

res = supabase.schema("outreach").table("b2b_sending_accounts").select("*").execute()
for acc in (res.data or []):
    print(f"ID: {acc['id']}")
    print(f"  Name: {acc['name']}")
    print(f"  SMTP: {acc['smtp_user']} @ {acc['smtp_host']}:{acc['smtp_port']}")
    print(f"  IMAP: {acc['imap_user']} @ {acc['imap_host']}:{acc['imap_port']}")
