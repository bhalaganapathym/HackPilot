from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_analyze_abstract_success():
    payload = {
        "abstract": "HackPilot is an intelligent co-pilot for hackathon participants using Next.js and FastAPI to improve pitch scores by 35%."
    }
    response = client.post("/api/abstract/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert "id" in data
    assert "overall_score" in data
    assert 0 <= data["overall_score"] <= 100
    assert "clarity" in data["scores"]
    assert "technical_depth" in data["scores"]
    assert len(data["weaknesses"]) > 0
    assert "gamification" in data
    assert data["gamification"]["xp_gained"] > 0

def test_analyze_abstract_with_delta():
    # Initial analysis
    res1 = client.post("/api/abstract/analyze", json={
        "abstract": "We are making an app to help people do stuff better."
    })
    assert res1.status_code == 200
    data1 = res1.json()
    id1 = data1["id"]

    # Improved analysis
    res2 = client.post("/api/abstract/analyze", json={
        "abstract": "HackPilot optimizes hackathon submissions for 1000+ developers using FastAPI and React, boosting jury evaluation throughput by 45%.",
        "previous_analysis_id": id1
    })
    assert res2.status_code == 200
    data2 = res2.json()

    assert data2["score_delta"] is not None
    assert data2["score_delta"] > 0
