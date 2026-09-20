import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_rapid_fire_evaluate_success():
    payload = {
        "pitch_text": (
            "Every hackathon weekend, 500 teams lose hours deciphering vague problem statements "
            "and dreading brutal judge interrogations. We built HackPilot: a real-time two-sided co-pilot. "
            "For hackers, it turns weaknesses into fixable XP quests and stress-tests architecture with an AI Red Team. "
            "For organizers, it clusters submissions and balances judge fatigue. "
            "Built with FastAPI and Amazon Bedrock, HackPilot turns chaotic demo day into a high-signal game."
        ),
        "time_taken_seconds": 58,
        "project_title": "HackPilot",
        "abstract_context": "Two-sided AI co-pilot for hackathons with gamified quest generation."
    }
    
    response = client.post("/api/rapid-fire/evaluate", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    assert "session_id" in data
    assert data["time_taken_seconds"] == 58
    assert "analysis" in data
    analysis = data["analysis"]
    
    # Check scores
    scores = analysis["scores"]
    for field in ["problem_clarity", "solution_clarity", "differentiation", "technical_explanation", "impact", "conciseness", "judge_readiness"]:
        assert field in scores
        assert 0 <= scores[field] <= 10
        
    # Check feedback
    assert len(analysis["strengths"]) > 0
    assert len(analysis["weaknesses"]) > 0
    assert len(analysis["specific_improvements"]) > 0
    assert len(analysis["suggested_revised_opening"]) > 10
    assert len(analysis["suggested_revised_closing"]) > 10
    
    # Check gamification
    assert "gamification" in data
    if data["gamification"]:
        assert data["gamification"]["xp_gained"] == 60

def test_rapid_fire_pitch_too_short():
    payload = {
        "pitch_text": "Too short",
        "time_taken_seconds": 20
    }
    response = client.post("/api/rapid-fire/evaluate", json=payload)
    assert response.status_code == 422
