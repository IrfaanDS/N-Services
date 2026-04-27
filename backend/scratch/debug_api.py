import httpx
import json

url = "http://127.0.0.1:8000/api/shopify/leads?page=1&page_size=20&sort_by=lead_score"

try:
    with httpx.Client(timeout=30.0) as client:
        response = client.get(url)
    print(f"Status Code: {response.status_code}")
    try:
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except:
        print(f"Response Content: {response.text}")
except Exception as e:
    print(f"Request failed: {e}")
