import httpx
import json

base = "http://127.0.0.1:8000/api/dashboard"

for endpoint in ["/b2b", "/shopify"]:
    print(f"\n{'='*50}")
    print(f"Testing: {base}{endpoint}")
    print('='*50)
    try:
        with httpx.Client(timeout=15.0) as client:
            response = client.get(f"{base}{endpoint}")
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(json.dumps(data, indent=2, default=str))
        else:
            print(f"Error: {response.text[:500]}")
    except Exception as e:
        print(f"Failed: {e}")
