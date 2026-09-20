import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_judge_simulator_start():
    response = client.post("/api/judge/session/start", json={
        "title": "CodeMorph Refactor Agent",
        "abstract": "Automated legacy code refactoring and technical debt removal in CI/CD pipelines.",
        "persona": "architect"
    })
    assert response.status_code == 201
    data = response.json()
    assert "session_id" in data
    assert data["persona"] == "architect"
    assert data["persona_name"] == "Dr. Aris"
    assert "opening_question" in data
    assert len(data["opening_question"]) > 10

def test_judge_simulator_respond_round():
    # 1. Start session
    r_start = client.post("/api/judge/session/start", json={
        "title": "SolarGrid Microgrid",
        "abstract": "Smart IoT power meters with AWS IoT Greengrass to dynamically route battery power.",
        "persona": "investor"
    })
    assert r_start.status_code == 201
    session_id = r_start.json()["session_id"]
    question = r_start.json()["opening_question"]

    # 2. Respond (Round 1)
    r_resp = client.post("/api/judge/session/respond", json={
        "session_id": session_id,
        "persona": "investor",
        "answer": "We have established pilots with municipal energy co-ops who pay a monthly SaaS subscription based on kilowatt-hours routed.",
        "history": [{"turn_index": 1, "speaker": "judge", "content": question}]
    })
    assert r_resp.status_code == 200
    data = r_resp.json()
    assert "score" in data
    assert 0 <= data["score"] <= 10
    assert "feedback" in data
    assert "xp_awarded" in data
    assert data["xp_awarded"] > 0
