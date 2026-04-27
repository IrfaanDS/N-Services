import os
import imaplib
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

res = supabase.schema("outreach").table("b2b_sending_accounts").select("*").execute()
accounts = res.data or []

for acc in accounts:
    print(f"Checking folders for {acc['name']} ({acc['imap_user']})...")
    try:
        mail = imaplib.IMAP4_SSL(acc["imap_host"])
        mail.login(acc["imap_user"], acc["imap_pass"])
        status, folders = mail.list()
        if status == 'OK':
            for f in folders:
                print(f"  {f.decode()}")
        mail.logout()
    except Exception as e:
        print(f"  FAILED: {e}")
    print("-" * 20)
