import httpx
import json
import time

url = "http://127.0.0.1:8000/api/dashboard/shopify"
print(f"Testing: {url}")
start = time.time()
try:
    with httpx.Client(timeout=60.0) as client:
        response = client.get(url)
    print(f"Status: {response.status_code}")
    print(f"Time: {time.time() - start:.2f}s")
    if response.status_code == 200:
        print(json.dumps(response.json(), indent=2))
    else:
        print(response.text)
except Exception as e:
    print(f"Failed: {e}")
