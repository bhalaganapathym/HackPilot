"""
Phase C — Organizer Intelligence Router

Endpoints:
  GET  /api/organizer/clusters         — run full embed+cluster pipeline, return cluster manifest
  POST /api/organizer/embed-all        — trigger embedding for all pending submissions
  GET  /api/organizer/submissions      — same as /api/submissions but with richer cluster metadata
"""

import logging
from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException, status
from sqlmodel import Session

from app.db import get_session
from app.services.embedding_service import embed_all_pending
from app.services.clustering_service import run_clustering
from app.services.submissions import SubmissionService
from app.services.judge_service import JudgeService
from app.schemas.judge_dossier import JudgeDossierResponse

logger = logging.getLogger("hackpilot.organizer")

router = APIRouter(prefix="/organizer", tags=["organizer"])


@router.post("/embed-all", summary="Embed all pending submissions with Titan")
async def embed_all(
    session: Session = Depends(get_session),
):
    """
    Triggers Titan Text Embeddings V2 for every submission whose
    embedding_status is not 'done'. Idempotent — safe to call multiple times.
    """
    result = await embed_all_pending(session)
    return {
        "message": "Embedding pass complete",
        "stats": result,
    }


@router.get("/clusters", summary="Run K-Means clustering and return Differentiation Dossiers")
async def get_clusters(
    session: Session = Depends(get_session),
):
    """
    Full Phase C pipeline:
    1. Embeds any pending submissions via Titan
    2. Runs K-Means on all embedded vectors
    3. Names each cluster with Nova Pro
    4. Generates a Differentiation Dossier per cluster
    5. Returns the cluster manifest

    Latency note: first call may take 30-90 seconds if many submissions need embedding.
    Subsequent calls are fast if embeddings are already cached.
    """
    # Step 1: embed any that are still pending
    embed_stats = await embed_all_pending(session)
    logger.info("Clusters endpoint | embed_stats=%s", embed_stats)

    # Step 2: cluster + dossier
    manifest = await run_clustering(session)
    manifest["embed_stats"] = embed_stats
    return manifest


@router.get("/submissions", summary="Organizer view of all submissions with cluster metadata")
async def get_organizer_submissions(
    session: Session = Depends(get_session),
):
    """
    Returns all submissions with domain_cluster and embedding_status enriched.
    Lighter than /clusters — does NOT re-run clustering.
    """
    subs = SubmissionService.get_submissions(session)
    out = []
    for s in subs:
        import json
        scores = json.loads(s.latest_scores) if s.latest_scores else {}
        out.append({
            "id": s.id,
            "title": s.title,
            "team_name": s.team_name or "Unknown",
            "abstract_snippet": (s.abstract or "")[:200],
            "status": s.status,
            "domain_cluster": s.domain_cluster,
            "embedding_status": s.embedding_status,
            "similarity_status": s.similarity_status,
            "score": scores.get("overall"),
            "has_judge_dossier": bool(s.judge_dossier_json),
            "created_at": s.created_at.isoformat(),
        })
    return out


@router.get("/submissions/{submission_id}/judge-dossier", response_model=JudgeDossierResponse, summary="Get or generate evidence-backed Judge Dossier")
async def get_organizer_judge_dossier(
    submission_id: str,
    session: Session = Depends(get_session),
):
    try:
        return await JudgeService.get_or_generate_dossier(session, submission_id, force_refresh=False)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

