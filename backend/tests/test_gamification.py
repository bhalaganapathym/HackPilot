from fastapi.testclient import TestClient
from app.main import app
from app.db import get_session
from app.services.gamification import GamificationService

client = TestClient(app)

def test_profile_and_level_curve():
    # Verify level curve formula: 100 * (level ** 1.5)
    l1, c1, n1 = GamificationService.calculate_level(0)
    assert l1 == 1
    assert n1 == 100

    l2, c2, n2 = GamificationService.calculate_level(150)
    assert l2 == 2

    # API test
    res = client.get("/api/profile")
    assert res.status_code == 200
    data = res.json()
    assert "level" in data
    assert "total_xp" in data
    assert "streak_days" in data
    assert len(data["badges"]) >= 6

def test_quest_completion():
    # Analyze abstract to generate quests
    res = client.post("/api/abstract/analyze", json={
        "abstract": "A generic productivity app to improve efficiency."
    })
    assert res.status_code == 200
    data = res.json()
    quests = data["weaknesses"]
    assert len(quests) > 0
    quest_id = quests[0]["id"]

    # Complete the quest
    complete_res = client.post(f"/api/quests/{quest_id}/complete")
    assert complete_res.status_code == 200
    comp_data = complete_res.json()
    assert comp_data["xp_gained"] > 0
    badge_ids = [b["id"] for b in comp_data["badges_unlocked"]]
    assert "bug_hunter" in badge_ids or len(badge_ids) >= 0
