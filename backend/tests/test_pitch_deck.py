import io
import pytest
from pypdf import PdfWriter
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def _create_test_pdf() -> bytes:
    writer = PdfWriter()
    # Add 2 slides
    writer.add_blank_page(width=720, height=405)
    writer.add_blank_page(width=720, height=405)
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()

def test_pitch_deck_upload_and_analyze_success():
    pdf_bytes = _create_test_pdf()
    
    response = client.post(
        "/api/pitch-deck/analyze",
        files={"file": ("pitch_deck.pdf", pdf_bytes, "application/pdf")},
        data={"submission_id": "sub-test-123"}
    )
    assert response.status_code == 200
    data = response.json()
    
    assert "deck_id" in data
    assert data["file_name"] == "pitch_deck.pdf"
    assert data["page_count"] == 2
    assert "analysis" in data
    analysis = data["analysis"]
    
    # Check slide analyses
    assert len(analysis["slide_analyses"]) > 0
    slide1 = analysis["slide_analyses"][0]
    assert "slide_number" in slide1
    assert "purpose" in slide1
    assert "clarity" in slide1
    
    # Check evidence gaps
    assert "evidence_gaps" in analysis
    assert isinstance(analysis["evidence_gaps"], list)
    if len(analysis["evidence_gaps"]) > 0:
        gap = analysis["evidence_gaps"][0]
        assert "claim" in gap
        assert "status" in gap
        assert "recommendation" in gap
    
    # Check AWS usage summary
    assert "aws_usage_summary" in analysis
    
    # Check categorized judge questions
    assert "judge_questions" in analysis
    jq = analysis["judge_questions"]
    assert "technical" in jq
    assert "aws" in jq
    
    # Check prioritized recommendations
    assert "recommendations" in analysis
    recs = analysis["recommendations"]
    assert "high_priority" in recs
    assert "medium_priority" in recs
    
    # Check category scores
    assert "category_scores" in analysis
    cat_scores = analysis["category_scores"]
    for k in ["problem_and_impact", "innovation", "technical_implementation", "aws_usage", "feasibility", "presentation_readiness"]:
        assert k in cat_scores
        assert 0 <= cat_scores[k] <= 100
        
    # Check gamification
    assert "gamification" in data
    if data["gamification"]:
        assert data["gamification"]["xp_gained"] == 75
        
    # Test GET endpoint to verify cached retrieval
    deck_id = data["deck_id"]
    get_resp = client.get(f"/api/pitch-deck/{deck_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["deck_id"] == deck_id

def test_pitch_deck_unsupported_format():
    response = client.post(
        "/api/pitch-deck/analyze",
        files={"file": ("presentation.pptx", b"Fake PPTX data", "application/vnd.ms-powerpoint")},
    )
    assert response.status_code == 400
    assert "Only PDF" in response.json()["error"]["message"]

def test_pitch_deck_empty_file():
    response = client.post(
        "/api/pitch-deck/analyze",
        files={"file": ("empty.pdf", b"", "application/pdf")},
    )
    assert response.status_code == 400
    assert "empty" in response.json()["error"]["message"].lower()
