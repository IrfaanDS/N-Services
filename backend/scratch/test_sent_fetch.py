import os
import imaplib
import email
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

res = supabase.schema("outreach").table("b2b_sending_accounts").select("*").execute()
accounts = res.data or []

def fetch_test(acc, mailbox):
    print(f"Testing {mailbox} for {acc['name']}...")
    try:
        mail = imaplib.IMAP4_SSL(acc["imap_host"])
        mail.login(acc["imap_user"], acc["imap_pass"])
        status, _ = mail.select(mailbox)
        if status != 'OK':
             status, _ = mail.select(mailbox.upper())
             if status != 'OK':
                 print(f"  FAILED to select {mailbox}")
                 return
        
        status, response = mail.search(None, 'ALL')
        if status == 'OK':
            msgs = response[0].split()
            print(f"  Found {len(msgs)} messages in {mailbox}")
            if msgs:
                # Fetch last one
                typ, data = mail.fetch(msgs[-1], '(BODY.PEEK[HEADER.FIELDS (SUBJECT)])')
                print(f"  Latest Subject: {data[0][1].decode().strip()}")
        mail.logout()
    except Exception as e:
        print(f"  ERROR: {e}")

for acc in accounts:
    fetch_test(acc, "INBOX")
    fetch_test(acc, "Sent")
    print("-" * 20)
