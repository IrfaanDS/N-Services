import asyncio
import os
import httpx
from datetime import datetime, timedelta
from pathlib import Path
from dotenv import load_dotenv

async def test_reach():
    backend_root = Path("c:/Univeristy/FYP-2/N-Services/backend")
    load_dotenv(backend_root / ".env")
    load_dotenv(backend_root.parent / ".env")
    
    api_key = os.getenv("REACHINBOX_API_KEY")
    base_url = os.getenv("REACHINBOX_BASE_URL", "https://api.reachinbox.ai/api/v1")
    
    if not api_key:
        print("No API Key")
        return

    end_date = datetime.now().strftime("%Y-%m-%d")
    start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    async with httpx.AsyncClient(base_url=base_url, headers=headers, timeout=8.0) as client:
        try:
            url = f"/analytics/summary?startDate={start_date}&endDate={end_date}"
            response = await client.post(url, json={"campaignIds": [], "excludeIds": []})
            print(f"Status: {response.status_code}")
            print(response.json())
        except Exception as e:
            print(f"Error: {e}")

asyncio.run(test_reach())
