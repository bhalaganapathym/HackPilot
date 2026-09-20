"""
Phase F — End-to-End Smoke Test
Reads deployed URLs from lambda_url.txt and ../frontend/amplify_url.txt
and verifies all critical endpoints.

Usage:
    cd e:/HackPilot-main/backend
    python verify_deployment.py
"""

import sys
import time
import json
import pathlib
import urllib.request
import urllib.error

def log(msg):
    print(f"[verify] {msg}", flush=True)


def get_url(filename: str, fallback: str) -> str:
    p = pathlib.Path(filename)
    if p.exists():
        return p.read_text().strip().rstrip("/")
    log(f"Warning: {filename} not found, using {fallback}")
    return fallback


def http_get(url: str, timeout: int = 30) -> tuple[int, dict]:
    try:
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=timeout) as r:
            body = json.loads(r.read())
            return r.status, body
    except urllib.error.HTTPError as e:
        return e.code, {}
    except Exception as e:
        return 0, {"error": str(e)}


def http_post(url: str, payload: dict, timeout: int = 60) -> tuple[int, dict]:
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        url, data=data,
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            body = json.loads(r.read())
            return r.status, body
    except urllib.error.HTTPError as e:
        try:
            body = json.loads(e.read())
        except Exception:
            body = {}
        return e.code, body
    except Exception as e:
        return 0, {"error": str(e)}


def main():
    lambda_url  = get_url("lambda_url.txt",           "http://localhost:8000")
    amplify_url = get_url("../frontend/amplify_url.txt", "http://localhost:3000")

    print("\n" + "="*60)
    print("HackPilot — Deployment Smoke Test")
    print(f"  Backend:  {lambda_url}")
    print(f"  Frontend: {amplify_url}")
    print("="*60 + "\n")

    results = []

    # ── Test 1: Backend health ─────────────────────────────────────────────────
    log("Test 1: GET /api/health")
    status, body = http_get(f"{lambda_url}/api/health")
    ok = status == 200 and body.get("status") in ("ok", "healthy")
    results.append(("GET /api/health", ok, f"status={status} body={body}"))
    log(f"  {'[PASS]' if ok else '[FAIL]'} — {status} {body}")

    # ── Test 2: Abstract Analyze (uses Bedrock) ────────────────────────────────
    log("Test 2: POST /api/abstract/analyze")
    payload = {
        "abstract": (
            "HackPilot is an AI-powered hackathon co-pilot that uses Amazon Bedrock "
            "to help teams write stronger abstracts, understand problem statements, "
            "and defend their ideas against red-team attacks."
        )
    }
    status, body = http_post(f"{lambda_url}/api/abstract/analyze", payload, timeout=90)
    ok = status == 200 and "overall_score" in body
    results.append(("POST /api/abstract/analyze", ok, f"status={status} score={body.get('overall_score')}"))
    log(f"  {'[PASS]' if ok else '[FAIL]'} — {status} score={body.get('overall_score')}")

    # ── Test 3: Frontend loads ─────────────────────────────────────────────────
    log("Test 3: GET Amplify homepage")
    try:
        req = urllib.request.Request(amplify_url, headers={"Accept": "text/html"})
        with urllib.request.urlopen(req, timeout=20) as r:
            html = r.read(500).decode("utf-8", errors="ignore")
            ok = r.status == 200 and ("HackPilot" in html or "<!DOCTYPE" in html or "html" in html.lower())
            results.append(("GET Amplify homepage", ok, f"status={r.status} snippet={html[:80]}"))
            log(f"  {'[PASS]' if ok else '[FAIL]'} — {r.status}")
    except Exception as e:
        results.append(("GET Amplify homepage", False, str(e)))
        log(f"  [FAIL] — {e}")

    # ── Summary ────────────────────────────────────────────────────────────────
    print("\n" + "="*60)
    print("Results:")
    passed = sum(1 for _, ok, _ in results if ok)
    for name, ok, detail in results:
        print(f"  {'[PASS]' if ok else '[FAIL]'} {name}")
        if not ok:
            print(f"     └─ {detail}")
    print(f"\n{passed}/{len(results)} tests passed")
    print("="*60)

    if passed < len(results):
        sys.exit(1)


if __name__ == "__main__":
    main()
