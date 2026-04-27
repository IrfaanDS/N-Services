import os
import requests
from dotenv import load_dotenv

load_dotenv()

# We can use the PostgREST API directly to get column info via OPTIONS or just query a row
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

def check_columns(schema, table):
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Profile": schema
    }
    # Querying a single row (or limit 0) to see keys
    res = requests.get(f"{url}/rest/v1/{table}?limit=1", headers=headers)
    if res.status_code == 200:
        data = res.json()
        if data:
            print(f"Columns in {schema}.{table}: {list(data[0].keys())}")
        else:
            print(f"Table {schema}.{table} is empty, cannot easily see columns via GET.")
            # Try to insert a dummy row or use another method?
            # Actually, we can check the migrations if they exist.
    else:
        print(f"Error checking columns for {schema}.{table}: {res.status_code} {res.text}")

print("Checking columns...")
check_columns("outreach", "b2b_sending_accounts")
check_columns("outreach", "b2b_campaign_leads")
check_columns("outreach", "b2b_campaigns")
