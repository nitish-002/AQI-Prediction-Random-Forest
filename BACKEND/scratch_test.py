import requests

urls = [
    "http://127.0.0.1:8000/aqi-trends",
    "http://127.0.0.1:8000/aqi-comparison",
    "http://127.0.0.1:8000/aqi-filter?pollutant=nox"
]

for url in urls:
    print(f"\n--- Testing {url} ---")
    try:
        r = requests.get(url)
        print(f"Status: {r.status_code}")
        print(r.json() if r.status_code == 200 else r.text[:200])
    except Exception as e:
        print(e)
