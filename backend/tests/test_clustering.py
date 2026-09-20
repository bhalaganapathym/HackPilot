import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.clustering_service import _pick_k

client = TestClient(app)

def test_pick_k_heuristic():
    assert _pick_k(1) == 1
    assert _pick_k(2) == 1
    assert _pick_k(3) == 2
    assert _pick_k(8) == 2
    assert _pick_k(18) == 3
    assert _pick_k(100) == 6  # Capped at MAX_K

def test_organizer_submissions_endpoint():
    response = client.get("/api/organizer/submissions")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    if len(data) > 0:
        first = data[0]
        assert "id" in first
        assert "title" in first
        assert "status" in first
        assert "domain_cluster" in first

def test_organizer_embed_all_endpoint():
    response = client.post("/api/organizer/embed-all")
    assert response.status_code == 200
    data = response.json()
    assert "stats" in data
    assert "total" in data["stats"]

def test_organizer_clusters_manifest_structure():
    response = client.get("/api/organizer/clusters")
    assert response.status_code == 200
    data = response.json()
    assert "k" in data
    assert "clusters" in data
    assert isinstance(data["clusters"], list)
    if len(data["clusters"]) > 0:
        c = data["clusters"][0]
        assert "id" in c
        assert "name" in c
        assert "count" in c
        assert "dossier" in c
        assert "submissions" in c
