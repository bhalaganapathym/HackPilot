from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_submission_crud_and_linking():
    # Create submission
    payload = {
        "title": "HackPilot Mission Control",
        "abstract": "Two-sided hackathon co-pilot built with FastAPI and Next.js.",
        "problem_statement_id": "ps-aws-01"
    }
    create_res = client.post("/api/submissions", json=payload)
    assert create_res.status_code == 201
    sub = create_res.json()
    sub_id = sub["id"]
    assert sub["title"] == payload["title"]

    # List submissions
    list_res = client.get("/api/submissions")
    assert list_res.status_code == 200
    subs = list_res.json()
    assert any(s["id"] == sub_id for s in subs)

    # Attach analysis to submission
    analysis_res = client.post("/api/abstract/analyze", json={
        "abstract": "Two-sided hackathon co-pilot built with FastAPI and Next.js for 500+ builders, cutting triage time by 40%.",
        "submission_id": sub_id
    })
    assert analysis_res.status_code == 200

    # Verify latest scores updated on submission
    get_res = client.get(f"/api/submissions/{sub_id}")
    assert get_res.status_code == 200
    updated_sub = get_res.json()
    assert updated_sub["latest_scores"] is not None
    assert "overall" in updated_sub["latest_scores"]
