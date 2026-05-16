import requests
import json
import time

BASE_URL = "http://localhost:8080/api"

def print_json(data):
    print(json.dumps(data, indent=2))

def test_endpoints():
    print(f"Connecting to Spring Boot Backend on {BASE_URL}...")
    
    # Wait for server to be up
    max_retries = 3
    for i in range(max_retries):
        try:
            requests.get("http://localhost:8080")
            break
        except requests.exceptions.ConnectionError:
            if i == max_retries - 1:
                print("Error: The Spring Boot server (port 8080) is not running!")
                print("Please click 'Run' in IntelliJ / PyCharm first, then run this test script again.")
                return
            print("  Waiting for server to start...")
            time.sleep(2)
            

    print("\n" + "="*50)
    print("2. Testing: GET /api/analytics/compare-branches")
    print("="*50)
    try:
        res = requests.get(f"{BASE_URL}/analytics/compare-branches")
        data = res.json()
        print(f"Success! Comparing all branches by package data.")
        print("Top 2 Branches:")
        print_json(data[:2] if len(data) > 1 else data)
    except Exception as e:
        print(f"Failed: {e}")

    print("\n" + "="*50)
    print("3. Testing: GET /api/analytics/trending-branches")
    print("="*50)
    try:
        res = requests.get(f"{BASE_URL}/analytics/trending-branches")
        data = res.json()
        print(f"Success! Discovered {len(data)} distinct trends.")
        print("Highest Trending Subject:")
        print_json(data[0] if data else {})
    except Exception as e:
        print(f"Failed: {e}")

    print("\n" + "="*50)
    print("4. Testing: POST /api/search-colleges")
    print("="*50)
    try:
        payload = {
            "rank": 24000,
            "category": "OC_BOYS",
            "branchType": "Pure_CSE"
        }
        res = requests.post(f"{BASE_URL}/search-colleges", json=payload)
        data = res.json()
        print(f"Success! Extracted {len(data)} rich college cards.")
        print("Top Probability Result:")
        print_json(data[0] if data else {})
    except Exception as e:
        print(f"Failed: {e}")

    print("\n" + "="*50)
    print("5. Testing: POST /api/reverse-calculate")
    print("="*50)
    try:
        payload = {
            "instcode": "JNTK",
            "branch_code": "CSE",
            "category": "OC_BOYS",
            "desired_probability": 80.0
        }
        res = requests.post(f"{BASE_URL}/reverse-calculate", json=payload)
        data = res.json()
        print("Success! Algebraically reversed ML output.")
        print("Rank Required for exactly 80% Chance at JNTK CSE:")
        print_json(data)
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    test_endpoints()
