import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_judge_dossier_endpoint():
    # 1. Get submissions
    r_subs = client.get("/api/submissions")
    assert r_subs.status_code == 200
    subs = r_subs.json()
    assert len(subs) > 0
    sub_id = subs[0]["id"]

    # 2. Get judge dossier
    response = client.get(f"/api/submissions/{sub_id}/judge-dossier")
    assert response.status_code == 200
    data = response.json()

    assert data["submission_id"] == sub_id
    assert "one_sentence_summary" in data
    assert 0 <= data["overall_score"] <= 100
    assert len(data["rubric"]) == 5
    for crit in data["rubric"]:
        assert "name" in crit
        assert 0 <= crit["score"] <= 10
        assert "evidence" in crit
        assert "evaluation" in crit
    assert len(data["standout_strengths"]) > 0
    assert len(data["critical_risks"]) > 0
    assert len(data["judge_questions"]) > 0
    for q in data["judge_questions"]:
        assert "question" in q
        assert "intent" in q
        assert "expected_signals" in q
        assert "red_flags" in q

def test_judge_dossier_not_found():
    response = client.get("/api/submissions/non-existent-sub-id/judge-dossier")
    assert response.status_code == 404
