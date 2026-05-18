"""
Smoke tests for EAPCET Intelligence Engine APIs.
Run: pytest tests/smoke/test_apis.py -v
Requires: backend :8080, ml-service :8000
"""
import os
import time

import pytest
import requests

BACKEND = os.environ.get("BACKEND_URL", "http://localhost:8080")
ML = os.environ.get("ML_URL", "http://localhost:8000")
TIMEOUT = 30


def _wait(url: str, path: str, attempts: int = 5) -> requests.Response:
    last = None
    for _ in range(attempts):
        try:
            last = requests.get(f"{url}{path}", timeout=TIMEOUT)
            if last.status_code < 500:
                return last
        except requests.RequestException as e:
            last = e
        time.sleep(2)
    if isinstance(last, requests.Response):
        return last
    raise RuntimeError(f"Service not reachable: {url}{path} ({last})")


def test_ml_readiness():
    r = _wait(ML, "/readiness")
    assert r.status_code == 200
    assert r.json().get("ready") is True


def test_backend_health():
    r = _wait(BACKEND, "/actuator/health")
    assert r.status_code == 200


def test_dashboard_stats():
    r = requests.get(f"{BACKEND}/api/stats/dashboard", timeout=TIMEOUT)
    assert r.status_code == 200
    data = r.json()
    assert data.get("total_colleges", 0) >= 0


def test_college_names():
    r = requests.get(f"{BACKEND}/api/colleges/names", timeout=TIMEOUT)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_search_requires_input():
    r = requests.post(f"{BACKEND}/api/search-colleges", json={}, timeout=TIMEOUT)
    assert r.status_code == 400


def test_search_with_rank():
    r = requests.post(
        f"{BACKEND}/api/search-colleges",
        json={"rank": 15000, "category": "OC_BOYS", "district": "Guntur"},
        timeout=TIMEOUT,
    )
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_trending_branches():
    r = requests.get(f"{BACKEND}/api/analytics/trending-branches", timeout=TIMEOUT)
    assert r.status_code == 200
    assert isinstance(r.json(), list)
