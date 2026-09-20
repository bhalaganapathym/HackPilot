"""
Phase 38 — Final End-to-End Acceptance Test

Executes every single workflow described in the acceptance criteria against
the live AWS deployment (CloudFront HTTPS endpoint):

1. PARTICIPANT FLOW:
   Problem Statement -> Explainer -> Question -> Answer -> Idea -> Abstract -> Analyzer -> Red Team -> Submit

2. PRACTICE FLOW:
   Judge Simulator Start -> Opening Question -> Round 1 Answer & Feedback -> Round 2 Answer & Feedback -> Round 3 Conclude & Verdict + XP

3. ORGANIZER FLOW:
   Submissions Ingested -> DynamoDB sync -> Titan Embedding -> Clusters Generated -> Differentiation Dossier -> Evidence-backed Judge Dossier

4. DEPLOYMENT FLOW:
   All executed over live public HTTPS (https://dw5virp5mxy8d.cloudfront.net/api)
"""

import json
import time
import urllib.request
import urllib.error

BASE_URL = "https://dw5virp5mxy8d.cloudfront.net/api"
AMPLIFY_URL = "https://main.d1mlf5y8eyh58y.amplifyapp.com"

def log(step, msg):
    print(f"[{step}] {msg}", flush=True)

def api_post(endpoint, payload):
    url = f"{BASE_URL}{endpoint}"
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url, data=data,
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=90) as r:
        return r.status, json.loads(r.read().decode("utf-8"))

def api_get(endpoint):
    url = f"{BASE_URL}{endpoint}"
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=90) as r:
        return r.status, json.loads(r.read().decode("utf-8"))

def run_acceptance_tests():
    print("\n" + "="*70)
    print("[TEST] RUNNING PHASE 38: FINAL END-TO-END ACCEPTANCE TESTS")
    print(f"   Target Backend (HTTPS): {BASE_URL}")
    print(f"   Target Frontend (Amplify): {AMPLIFY_URL}")
    print("="*70 + "\n")

    # ── FLOW 1: PARTICIPANT FLOW ──────────────────────────────────────────────
    log("PARTICIPANT", "1.1 Calling Problem Explainer (Bedrock Nova Pro)...")
    prob_text = "Develop an automated logistics and delivery coordination engine that optimizes urban parcel routing under extreme traffic conditions."
    status, expl = api_post("/problem/explain", {"problem_statement": prob_text})
    assert status == 200
    assert "plain_english_summary" in expl
    assert len(expl["requirements"]["must_have"]) > 0
    log("PARTICIPANT", f"  Summary: {expl['plain_english_summary'][:80]}...")

    log("PARTICIPANT", "1.2 Asking clarifying question to Problem Oracle...")
    status, ans = api_post("/problem/ask", {
        "problem_statement": prob_text,
        "question": "Are electric cargo bikes allowed for routing?"
    })
    assert status == 200
    assert "answer" in ans
    log("PARTICIPANT", f"  Answer: {ans['answer'][:80]}... (Covered: {ans.get('is_covered')})")

    log("PARTICIPANT", "1.3 Analyzing Abstract with scoring heuristics (Bedrock Nova Pro)...")
    abstract_text = (
        "UrbanRoute is an AI-powered parcel routing engine built with FastAPI and AWS. "
        "It ingests dynamic traffic sensor feeds and optimizes multi-stop delivery routes, "
        "reducing last-mile emissions by 34% and driver idle time by 22 minutes per shift. "
        "Integrated with Amazon Bedrock for automated driver dispatch coordination."
    )
    status, analysis = api_post("/abstract/analyze", {"abstract": abstract_text})
    assert status == 200
    overall_score = analysis.get("overall_score")
    assert overall_score is not None
    log("PARTICIPANT", f"  Abstract Evaluated: Overall Score = {overall_score}/100")

    log("PARTICIPANT", "1.4 Stress-testing idea in Red Team Arena...")
    status, attack_res = api_post("/redteam/attack", {
        "idea": "UrbanRoute AI parcel routing engine with dynamic traffic rerouting",
        "intensity": "fair"
    })
    assert status == 200
    attacks = attack_res.get("attacks", [])
    assert len(attacks) > 0
    attack_1 = attacks[0]
    log("PARTICIPANT", f"  Generated {len(attacks)} attack vectors. Attack 1: {attack_1['title']}")

    log("PARTICIPANT", "1.5 Defending against Red Team attack vector...")
    status, defend_res = api_post("/redteam/defend", {
        "attack_id": attack_1["id"],
        "defense": "We deploy redundant localized edge cache nodes and asynchronous batch dispatch fallbacks when network connectivity drops."
    })
    assert status == 200
    log("PARTICIPANT", f"  Defense Rated: {defend_res.get('rating')}/10, HP Change: {defend_res.get('hp_change')}")

    log("PARTICIPANT", "1.6 Submitting finalized project...")
    status, sub = api_post("/submissions", {
        "title": "UrbanRoute Dispatch",
        "team_name": "Team Velocity",
        "abstract": abstract_text,
        "problem_statement": prob_text
    })
    assert status in (200, 201)
    submission_id = sub["id"]
    log("PARTICIPANT", f"  Project submitted successfully! Submission ID: {submission_id}")

    # ── FLOW 2: PRACTICE FLOW (JUDGE SIMULATOR) ──────────────────────────────
    log("PRACTICE", "2.1 Starting Judge Simulator session with Dr. Aris (Systems Architect)...")
    status, session_data = api_post("/judge/session/start", {
        "submission_id": submission_id,
        "title": "UrbanRoute Dispatch",
        "abstract": abstract_text,
        "persona": "architect"
    })
    assert status in (200, 201)
    judge_session_id = session_data["session_id"]
    opening_q = session_data["opening_question"]
    log("PRACTICE", f"  Judge Question: {opening_q[:90]}...")

    log("PRACTICE", "2.2 Round 1 Defense...")
    history = [{"turn_index": 1, "speaker": "judge", "content": opening_q}]
    status, r1 = api_post("/judge/session/respond", {
        "session_id": judge_session_id,
        "persona": "architect",
        "answer": "We utilize asynchronous non-blocking worker pools in FastAPI paired with Redis in-memory pub-sub to sustain 2,500 concurrent driver telemetry events.",
        "history": history
    })
    assert status == 200
    assert r1["score"] >= 0
    history.append({"turn_index": 2, "speaker": "participant", "content": "Our defense"})
    history.append({"turn_index": 3, "speaker": "judge", "content": r1.get("followup_question", "Next question")})
    log("PRACTICE", f"  Round 1 Score: {r1['score']}/10, XP Awarded: +{r1.get('xp_awarded')} XP")

    log("PRACTICE", "2.3 Round 2 Defense...")
    status, r2 = api_post("/judge/session/respond", {
        "session_id": judge_session_id,
        "persona": "architect",
        "answer": "Our circuit breakers trip immediately to cached static waypoints if AWS Bedrock or the routing solver exceeds 400ms latency boundaries.",
        "history": history
    })
    assert status == 200
    history.append({"turn_index": 4, "speaker": "participant", "content": "Round 2 defense"})
    history.append({"turn_index": 5, "speaker": "judge", "content": r2.get("followup_question", "Final round question")})
    log("PRACTICE", f"  Round 2 Score: {r2['score']}/10, Follow-up: {r2.get('followup_question', '')[:60]}...")

    log("PRACTICE", "2.4 Round 3 Final Defense (Concluded Trial)...")
    status, r3 = api_post("/judge/session/respond", {
        "session_id": judge_session_id,
        "persona": "architect",
        "answer": "For disaster recovery, our state machine persists to Amazon DynamoDB with automatic cross-region replication and encrypted offline backups.",
        "history": history
    })
    assert status == 200
    log("PRACTICE", f"  Final Round: is_concluded={r3.get('is_concluded')}, Composite Score: {r3.get('composite_score')}/100")
    log("PRACTICE", f"  Final Verdict: {r3.get('final_verdict')}")

    # ── FLOW 3: ORGANIZER FLOW ────────────────────────────────────────────────
    log("ORGANIZER", "3.1 Fetching organizer submissions...")
    status, org_subs = api_get("/organizer/submissions")
    assert status == 200
    assert len(org_subs) > 0
    log("ORGANIZER", f"  Organizer sees {len(org_subs)} projects across the cohort.")

    log("ORGANIZER", "3.2 Triggering batch embedding pass with Titan Embeddings V2...")
    status, embed_stats = api_post("/organizer/embed-all", {})
    assert status == 200
    log("ORGANIZER", f"  Titan Embedding Status: {embed_stats}")

    log("ORGANIZER", "3.3 Fetching K-Means Clusters and Differentiation Dossiers...")
    status, clusters_manifest = api_get("/organizer/clusters")
    assert status == 200
    assert "clusters" in clusters_manifest
    log("ORGANIZER", f"  Clusters Generated (k={clusters_manifest.get('k')}): {len(clusters_manifest['clusters'])} clusters")
    if clusters_manifest["clusters"]:
        first_c = clusters_manifest["clusters"][0]
        log("ORGANIZER", f"  Cluster 0: '{first_c.get('name')}' ({first_c.get('count')} projects)")

    log("ORGANIZER", f"3.4 Generating evidence-backed Judge Dossier for submission {submission_id}...")
    status, dossier = api_get(f"/submissions/{submission_id}/judge-dossier")
    assert status == 200
    assert "rubric" in dossier
    assert len(dossier["rubric"]) > 0
    assert len(dossier["judge_questions"]) > 0
    log("ORGANIZER", f"  Judge Dossier Generated: Overall Score = {dossier.get('overall_score')}/100")
    log("ORGANIZER", f"  Rubric Criteria: {[c['name'] for c in dossier['rubric'][:3]]}")
    log("ORGANIZER", f"  Suggested Judge Questions: {len(dossier['judge_questions'])} questions generated")

    # ── FLOW 4: DEPLOYMENT FLOW ───────────────────────────────────────────────
    log("DEPLOYMENT", "4.1 Verifying Amplify Frontend loads cleanly over HTTPS...")
    req = urllib.request.Request(AMPLIFY_URL, headers={"Accept": "text/html"})
    with urllib.request.urlopen(req, timeout=30) as r:
        assert r.status == 200
    log("DEPLOYMENT", f"  Amplify Frontend responded HTTP 200 OK!")

    print("\n" + "="*70)
    print("[SUCCESS] ALL ACCEPTANCE WORKFLOWS PASSED 100%!")
    print("="*70)

if __name__ == "__main__":
    run_acceptance_tests()
