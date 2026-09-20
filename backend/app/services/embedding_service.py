"""
Phase C — Titan Text Embeddings V2

Generates 512-dimensional embeddings for each submission abstract using
amazon.titan-embed-text-v2:0 and persists them to SQLite for clustering.
"""

import json
import logging
from typing import Optional

from sqlmodel import Session, select

from app.models.submission import Submission
from app.ai.bedrock_provider import TitanEmbeddingClient

logger = logging.getLogger("hackpilot.embedding")

_titan_client: Optional[TitanEmbeddingClient] = None


def _get_titan() -> TitanEmbeddingClient:
    global _titan_client
    if _titan_client is None:
        _titan_client = TitanEmbeddingClient()
    return _titan_client


async def embed_submission(session: Session, submission_id: str) -> bool:
    """
    Generate and persist a Titan embedding for a single submission.
    Returns True if successful, False on error.
    """
    submission = session.get(Submission, submission_id)
    if not submission:
        logger.warning("embed_submission: submission %s not found", submission_id)
        return False

    if submission.embedding_status == "done":
        logger.info("embed_submission: %s already embedded — skipping", submission_id)
        return True

    text = submission.abstract or ""
    if not text.strip():
        logger.warning("embed_submission: %s has empty abstract — skipping", submission_id)
        return False

    try:
        titan = _get_titan()
        vector = await titan.embed(text)

        submission.embedding_json = json.dumps(vector)
        submission.embedding_status = "done"
        session.add(submission)
        session.commit()
        session.refresh(submission)

        logger.info(
            "embed_submission | id=%s | dim=%d | status=done",
            submission_id, len(vector)
        )
        return True

    except Exception as exc:
        submission.embedding_status = "error"
        session.add(submission)
        session.commit()
        logger.error("embed_submission | id=%s | error=%s", submission_id, exc)
        return False


async def embed_all_pending(session: Session) -> dict:
    """
    Batch-embed all submissions whose embedding_status is not 'done'.
    Returns a summary dict: {total, succeeded, failed, skipped}.
    """
    pending = session.exec(
        select(Submission).where(Submission.embedding_status != "done")
    ).all()

    results = {"total": len(pending), "succeeded": 0, "failed": 0, "skipped": 0}

    for sub in pending:
        if not sub.abstract or not sub.abstract.strip():
            results["skipped"] += 1
            continue
        ok = await embed_submission(session, sub.id)
        if ok:
            results["succeeded"] += 1
        else:
            results["failed"] += 1

    logger.info("embed_all_pending | %s", results)
    return results
