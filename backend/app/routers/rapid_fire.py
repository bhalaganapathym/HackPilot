import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.db import get_session
from app.schemas.rapid_fire import RapidFireEvaluateRequest, RapidFireResponse
from app.services.rapid_fire import RapidFireService

logger = logging.getLogger("hackpilot.rapid_fire_router")

router = APIRouter(prefix="/rapid-fire", tags=["rapid_fire"])

@router.post("/evaluate", response_model=RapidFireResponse, status_code=status.HTTP_200_OK)
async def evaluate_rapid_fire(
    payload: RapidFireEvaluateRequest,
    session: Session = Depends(get_session)
):
    """
    Evaluate a 60-second rapid fire elevator pitch.
    Scores across 7 core dimensions, identifies concrete strengths and weaknesses,
    and provides rewritten killer opening and closing lines.
    """
    try:
        return await RapidFireService.evaluate(session, payload)
    except Exception as exc:
        logger.error("evaluate_rapid_fire error: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to evaluate rapid fire pitch: {str(exc)}"
        )
