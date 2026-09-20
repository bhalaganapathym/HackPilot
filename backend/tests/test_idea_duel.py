import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_idea_duel_success():
    payload = {
        "idea_a": {
            "title": "EcoCampus Smart Bins",
            "description": "IoT-connected waste receptacles with optical sorting sensors to classify recyclable materials on campus.",
            "tech_stack": "Raspberry Pi, AWS IoT Core, FastAPI",
            "target_users": "University facility managers and eco-conscious students"
        },
        "idea_b": {
            "title": "Campus PowerGrid Optimizer",
            "description": "Predictive energy load balancing software using historical consumption telemetry and weather forecast models.",
            "tech_stack": "FastAPI, Amazon Bedrock, DynamoDB, React",
            "target_users": "Campus sustainability directors and operations engineers"
        },
        "problem_statement": "Campuses generate excessive carbon footprint and landfill waste due to lack of automated monitoring."
    }
    
    response = client.post("/api/duel/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    assert "duel_id" in data
    assert "analysis" in data
    analysis = data["analysis"]
    
    # Verify Idea A and Idea B evaluations
    assert "idea_a" in analysis
    assert "idea_b" in analysis
    assert len(analysis["idea_a"]["strengths"]) > 0
    assert len(analysis["idea_a"]["risks"]) > 0
    assert len(analysis["idea_a"]["judge_questions"]) > 0
    
    assert len(analysis["idea_b"]["strengths"]) > 0
    assert len(analysis["idea_b"]["risks"]) > 0
    assert len(analysis["idea_b"]["judge_questions"]) > 0
    
    # Verify 4-dimension comparison
    comp = analysis["comparison"]
    assert "problem_strength" in comp
    assert "differentiation" in comp
    assert "technical_feasibility" in comp
    assert "impact" in comp
    
    # CRITICAL: Confirm NO winner declaration
    raw_text = response.text.lower()
    assert "winner" not in data
    assert "winning_idea" not in data
    
    # Verify shared risks and improvement opportunities
    assert len(analysis["shared_risks"]) > 0
    assert len(analysis["improvement_opportunities"]) > 0
    
    # Verify Gamification XP
    assert "gamification" in data
    if data["gamification"]:
        assert data["gamification"]["xp_gained"] == 50

def test_idea_duel_validation_missing_idea():
    # Only idea_a provided, idea_b missing
    payload = {
        "idea_a": {
            "title": "Solo Concept",
            "description": "A single concept without any sparring partner idea."
        }
    }
    response = client.post("/api/duel/analyze", json=payload)
    assert response.status_code == 422
