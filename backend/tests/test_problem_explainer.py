from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

SAMPLE_PROBLEM = (
    "Participants must build a privacy-first web application for community disaster relief. "
    "The application should support offline synchronization and must not leak any personal identifiable information. "
    "Submissions will be judged on usability, cold-start latency, and fault tolerance."
)

def test_explain_problem_endpoint():
    res = client.post("/api/problem/explain", json={"problem_statement": SAMPLE_PROBLEM})
    assert res.status_code == 200
    data = res.json()

    assert "plain_english_summary" in data
    assert len(data["requirements"]["must_have"]) > 0
    assert len(data["clarifying_questions"]) == 5
    assert len(data["constraints"]) > 0

def test_ask_problem_question_covered():
    res = client.post("/api/problem/ask", json={
        "problem_statement": SAMPLE_PROBLEM,
        "question": "Is offline synchronization supported or required?"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["is_covered"] is True
    assert len(data["cited_phrases"]) > 0

def test_ask_problem_question_not_covered():
    res = client.post("/api/problem/ask", json={
        "problem_statement": SAMPLE_PROBLEM,
        "question": "What is the maximum prize amount in euros?"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["is_covered"] is False
    answer_lower = data["answer"].lower()
    # Accept any reasonable "not covered" phrasing from any provider
    assert any(phrase in answer_lower for phrase in [
        "does not explicitly specify",
        "does not specify",
        "not mentioned",
        "not provided",
        "not covered",
        "not include",
        "no information",
        "does not provide",
        "does not address",
    ])
