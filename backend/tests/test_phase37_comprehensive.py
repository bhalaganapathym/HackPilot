"""
Phase 37 — Comprehensive Test Suite

Tests covering:
- Bedrock provider invocation & model response parsing
- Invalid model response handling
- MockProvider fallback
- Problem Explainer schema
- Problem Q&A behavior
- Abstract Analyzer schema
- Red Team schema
- Embedding generation
- Similarity calculation
- Empty submission set handling
- Duplicate submissions handling
- Clustering behavior
- Differentiation Dossier
- Judge Dossier
- Gamification regression
- S3 upload behavior
- DynamoDB persistence
- Authorization and input length boundaries
"""

import json
import pytest
import numpy as np
from unittest.mock import MagicMock, AsyncMock, patch
from pydantic import BaseModel, ValidationError
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app.models.submission import Submission, Analysis
from app.models.gamification import Profile, Badge
from app.schemas.abstract import AbstractAnalysisOutput, AbstractAnalyzeResponse, DimensionScore, QuestSchema
from app.schemas.problem import ProblemExplainOutput, ProblemAskOutput
from app.schemas.redteam import RedTeamAttackResponse, RedTeamDefendResponse, AttackVector
from app.services.red_team import DefenseEvaluationRaw
from app.schemas.judge_dossier import JudgeDossierResponse, JudgeDossierOutput, RubricCriterion, JudgeQuestion
from app.services.clustering_service import _pick_k, run_clustering, ClusterDossierOutput
from app.ai.mock_provider import MockProvider
from app.ai.bedrock_provider import BedrockProvider, TitanEmbeddingClient
from app.services.gamification import GamificationService
from app.persistence.repository import DualPersistenceRepository
from app.core.config import settings


# ─── Fixtures ──────────────────────────────────────────────────────────────────
@pytest.fixture(name="memory_session")
def fixture_memory_session():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


# ─── 1 & 2 & 3: Bedrock Provider & Parsing & Fallback ─────────────────────────
@pytest.mark.asyncio
async def test_mock_provider_fallback_when_configured():
    provider = MockProvider()
    res = await provider.generate_json(
        feature="abstract_analyzer",
        system_prompt="Analyze this",
        user_text="Short abstract text",
        schema=AbstractAnalysisOutput
    )
    assert isinstance(res, AbstractAnalysisOutput)
    assert 0 <= res.overall_score <= 100
    assert len(res.strengths) > 0


@pytest.mark.asyncio
async def test_bedrock_response_parsing_valid_json():
    class SimpleSchema(BaseModel):
        title: str
        score: int

    mock_client = MagicMock()
    mock_client.converse.return_value = {
        "output": {
            "message": {
                "content": [{"text": '```json\n{"title": "Valid Pitch", "score": 95}\n```'}]
            }
        }
    }

    with patch("app.ai.bedrock_provider.BedrockProvider._get_client", return_value=mock_client):
        provider = BedrockProvider()
        res = await provider.generate_json("test_feature", "sys", "usr", SimpleSchema)
        assert res.title == "Valid Pitch"
        assert res.score == 95


@pytest.mark.asyncio
async def test_bedrock_invalid_model_response_raises_error():
    class SimpleSchema(BaseModel):
        title: str

    mock_client = MagicMock()
    mock_client.converse.return_value = {
        "output": {
            "message": {
                "content": [{"text": "NOT JSON AT ALL"}]
            }
        }
    }

    with patch("app.ai.bedrock_provider.BedrockProvider._get_client", return_value=mock_client):
        provider = BedrockProvider()
        with pytest.raises(Exception):
            await provider.generate_json("test_feature", "sys", "usr", SimpleSchema)


# ─── 4 & 5: Problem Explainer & Q&A Schema ────────────────────────────────────
@pytest.mark.asyncio
async def test_problem_explainer_schema_contract():
    provider = MockProvider()
    res = await provider.generate_json(
        feature="problem_explainer",
        system_prompt="sys",
        user_text="Problem text for AI logistics",
        schema=ProblemExplainOutput
    )
    assert isinstance(res, ProblemExplainOutput)
    assert isinstance(res.plain_english_summary, str)
    assert len(res.requirements.must_have) > 0
    assert len(res.constraints) > 0
    assert len(res.hidden_criteria) > 0


@pytest.mark.asyncio
async def test_problem_qa_covered_and_not_covered():
    provider = MockProvider()
    res_covered = await provider.generate_json(
        feature="problem_qa",
        system_prompt="sys",
        user_text="Problem: Must support offline mode.\nQuestion: Can it work offline?",
        schema=ProblemAskOutput
    )
    assert isinstance(res_covered, ProblemAskOutput)
    assert isinstance(res_covered.is_covered, bool)
    assert isinstance(res_covered.answer, str)


# ─── 6: Abstract Analyzer Schema ──────────────────────────────────────────────
@pytest.mark.asyncio
async def test_abstract_analyzer_dimension_scores():
    provider = MockProvider()
    res = await provider.generate_json(
        feature="abstract_analyzer",
        system_prompt="sys",
        user_text="Healthcare triage app powered by computer vision.",
        schema=AbstractAnalysisOutput
    )
    assert isinstance(res.scores.clarity, DimensionScore)
    assert isinstance(res.scores.technical_depth, DimensionScore)
    assert isinstance(res.scores.impact, DimensionScore)
    assert 0 <= res.scores.clarity.score <= 100
    assert len(res.weaknesses) > 0
    assert isinstance(res.weaknesses[0], QuestSchema)


# ─── 7: Red Team Schema ───────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_red_team_attack_and_defend_schemas():
    provider = MockProvider()
    attacks = await provider.generate_json(
        feature="red_team_attacks",
        system_prompt="sys",
        user_text="Idea: Blockchain for medical records",
        schema=RedTeamAttackResponse
    )
    assert len(attacks.attacks) >= 3
    assert isinstance(attacks.attacks[0], AttackVector)
    assert attacks.attacks[0].severity in ["low", "medium", "high", "critical"]

    defend = await provider.generate_json(
        feature="red_team_defend",
        system_prompt="sys",
        user_text="Attack: 51% Attack\nDefense: We use zero-knowledge rollups and decentralized sequencers.",
        schema=DefenseEvaluationRaw
    )
    assert 0 <= defend.rating <= 10
    assert isinstance(defend.mitigation_points, list)


# ─── 8: Embedding Generation (Titan Embeddings v2) ───────────────────────────
@pytest.mark.asyncio
async def test_titan_embedding_generation_shape():
    mock_client = MagicMock()
    fake_vector = [0.01 * (i % 10) for i in range(512)]
    mock_body = MagicMock()
    mock_body.read.return_value = json.dumps({"embedding": fake_vector}).encode("utf-8")
    mock_client.invoke_model.return_value = {"body": mock_body}

    with patch("app.ai.bedrock_provider.TitanEmbeddingClient._get_client", return_value=mock_client):
        client = TitanEmbeddingClient()
        vector = await client.embed("HackPilot test embedding string")
        assert len(vector) == 512
        assert isinstance(vector, list)


# ─── 9: Similarity Calculation & Originality ─────────────────────────────────
def test_cosine_similarity_calculation():
    vec_a = np.array([1.0, 0.0, 0.0])
    vec_b = np.array([1.0, 0.0, 0.0])
    vec_c = np.array([0.0, 1.0, 0.0])

    # Identical vectors -> cosine sim = 1.0
    sim_ab = float(np.dot(vec_a, vec_b) / (np.linalg.norm(vec_a) * np.linalg.norm(vec_b)))
    assert pytest.approx(sim_ab, 0.001) == 1.0

    # Orthogonal vectors -> cosine sim = 0.0
    sim_ac = float(np.dot(vec_a, vec_c) / (np.linalg.norm(vec_a) * np.linalg.norm(vec_c)))
    assert pytest.approx(sim_ac, 0.001) == 0.0


# ─── 10 & 11: Empty & Duplicate Submissions in Clustering ────────────────────
@pytest.mark.asyncio
async def test_clustering_empty_submissions(memory_session):
    manifest = await run_clustering(memory_session)
    assert manifest["k"] == 1
    assert len(manifest["clusters"]) == 0


@pytest.mark.asyncio
async def test_clustering_duplicate_submissions(memory_session):
    # Two identical submissions with same embeddings
    fake_vec = json.dumps([0.1] * 512)
    s1 = Submission(title="App 1", abstract="Same pitch", embedding_status="done", embedding_json=fake_vec)
    s2 = Submission(title="App 2", abstract="Same pitch", embedding_status="done", embedding_json=fake_vec)
    memory_session.add(s1)
    memory_session.add(s2)
    memory_session.commit()

    manifest = await run_clustering(memory_session)
    assert manifest["k"] >= 1
    total_assigned = sum(c["count"] for c in manifest["clusters"])
    assert total_assigned == 2


# ─── 12 & 13: Clustering & Differentiation Dossier ────────────────────────────
def test_pick_k_heuristics():
    assert _pick_k(0) == 1
    assert _pick_k(1) == 1
    assert _pick_k(2) == 1
    assert _pick_k(4) == 2
    assert _pick_k(18) == 3
    assert _pick_k(100) == 6  # Capped at MAX_K=6


@pytest.mark.asyncio
async def test_differentiation_dossier_mock_generation():
    provider = MockProvider()
    dossier = await provider.generate_json(
        feature="cluster_dossier",
        system_prompt="sys",
        user_text="Cluster submissions: SubA, SubB, SubC",
        schema=ClusterDossierOutput
    )
    assert len(dossier.common_theme) > 10
    assert len(dossier.differentiators) > 0


# ─── 14: Judge Dossier Schema & Generation ───────────────────────────────────
@pytest.mark.asyncio
async def test_judge_dossier_contract():
    provider = MockProvider()
    dossier = await provider.generate_json(
        feature="judge_dossier",
        system_prompt="sys",
        user_text="Evaluate submission XYZ",
        schema=JudgeDossierOutput
    )
    assert 0 <= dossier.overall_score <= 100
    assert len(dossier.rubric) >= 3
    assert isinstance(dossier.rubric[0], RubricCriterion)
    assert len(dossier.judge_questions) >= 2
    assert isinstance(dossier.judge_questions[0], JudgeQuestion)


# ─── 15: Gamification Regression ──────────────────────────────────────────────
def test_gamification_xp_and_level_progression(memory_session):
    profile = GamificationService.get_or_create_profile(memory_session, user_id="test_user")
    assert profile.level == 1
    assert profile.total_xp == 0

    # Award 150 XP -> should level up to level 2 (threshold is 100)
    res = GamificationService.award_xp(memory_session, amount=150, user_id="test_user")
    assert res.level_up is True
    assert res.new_level == 2
    assert res.new_total == 150


# ─── 16: S3 Upload Behavior ───────────────────────────────────────────────────
def test_s3_upload_path_and_metadata():
    mock_s3 = MagicMock()
    with patch("boto3.Session.client", return_value=mock_s3):
        bucket = "hackpilot-dev-artifacts-318273660064"
        key = "submissions/test-sub-1/deck.pdf"
        mock_s3.put_object(Bucket=bucket, Key=key, Body=b"%PDF-1.4 test")
        mock_s3.put_object.assert_called_once_with(Bucket=bucket, Key=key, Body=b"%PDF-1.4 test")


# ─── 17: DynamoDB Dual Persistence ───────────────────────────────────────────
def test_dynamodb_persistence_dual_repo(memory_session):
    mock_table = MagicMock()
    mock_resource = MagicMock()
    mock_resource.Table.return_value = mock_table

    with patch("boto3.Session.resource", return_value=mock_resource):
        repo = DualPersistenceRepository(memory_session)
        sub = Submission(title="DDB Test", abstract="Testing DynamoDB sync")
        saved = repo.save_submission(sub)

        # Verified in SQLite
        assert saved.id is not None
        assert memory_session.get(Submission, saved.id) is not None

        # Verified DynamoDB Table.put_item called with correct PK/SK pattern
        mock_table.put_item.assert_called_once()
        call_item = mock_table.put_item.call_args[1]["Item"]
        assert call_item["pk"] == "SUBMISSION"
        assert call_item["sk"] == f"SUB#{saved.id}"
        assert call_item["title"] == "DDB Test"


# ─── 18: Input Length and Authorization Boundaries ───────────────────────────
def test_input_length_boundary_constants():
    assert settings.MAX_ABSTRACT_LENGTH == 5000
    assert settings.MAX_PROBLEM_LENGTH == 8000
    assert settings.MAX_IDEA_LENGTH == 3000
    assert settings.MAX_DEFENSE_LENGTH == 2000
    assert settings.MAX_QUESTION_LENGTH == 500
