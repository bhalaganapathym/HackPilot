from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

SAMPLE_IDEA = "A real-time AI security camera analyzer built with WebSockets and computer vision to alert parents."

def test_red_team_attack_generation():
    res = client.post("/api/redteam/attack", json={
        "idea": SAMPLE_IDEA,
        "intensity": "fair"
    })
    assert res.status_code == 200
    data = res.json()
    assert "battle_id" in data
    assert len(data["attacks"]) >= 6
    assert data["initial_hp"] == 100
    # Tailored to camera / real-time
    domains = [a["domain"] for a in data["attacks"]]
    assert "Privacy & Security" in domains or "Scalability & Latency" in domains

def test_red_team_defend_attack():
    res = client.post("/api/redteam/defend", json={
        "attack_id": "atk-1",
        "defense": "We implement client-side encryption and an in-memory Redis token cache to rate limit requests and prevent latency spikes.",
        "current_hp": 80
    })
    assert res.status_code == 200
    data = res.json()
    assert data["rating"] >= 6
    assert data["hp_change"] > 0
    assert data["current_hp"] > 80
    assert "xp_result" in data
