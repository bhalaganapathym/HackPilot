import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.db import get_session
from app.schemas.duel import DuelRequest, DuelResponse
from app.services.idea_duel import IdeaDuelService

logger = logging.getLogger("hackpilot.duel_router")

router = APIRouter(prefix="/duel", tags=["duel"])

@router.post("/analyze", response_model=DuelResponse, status_code=status.HTTP_200_OK)
async def analyze_idea_duel(
    payload: DuelRequest,
    session: Session = Depends(get_session)
):
    """
    Conduct a structured 5-round comparative analysis between two hackathon ideas.
    Exposes trade-offs, technical risks, differentiation signals, and judge challenges.
    Strictly avoids picking a winner.
    """
    try:
        return await IdeaDuelService.analyze(session, payload)
    except Exception as exc:
        logger.error("analyze_idea_duel error: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze idea duel: {str(exc)}"
        )
