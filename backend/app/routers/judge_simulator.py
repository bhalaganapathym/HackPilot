"""
Phase E — Judge Simulator Router

Endpoints:
  POST /api/judge/session/start   — Initializes cross-examination with selected persona
  POST /api/judge/session/respond — Evaluates defense, scores response, gives follow-up or verdict
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.db import get_session
from app.schemas.judge_simulator import (
    SimulatorSessionStartRequest,
    SimulatorSessionStartResponse,
    SimulatorRespondRequest,
    SimulatorRespondResponse,
)
from app.services.judge_simulator_service import JudgeSimulatorService

logger = logging.getLogger("hackpilot.judge_simulator")

router = APIRouter(prefix="/judge/session", tags=["judge_simulator"])


@router.post("/start", response_model=SimulatorSessionStartResponse, status_code=status.HTTP_201_CREATED)
async def start_judge_session(
    payload: SimulatorSessionStartRequest,
    session: Session = Depends(get_session)
):
    """
    Start an interactive judging simulation trial against an AI persona.
    Returns the opening targeted challenge question.
    """
    try:
        return await JudgeSimulatorService.start_session(session, payload)
    except Exception as exc:
        logger.error("start_judge_session error: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start judge session: {str(exc)}"
        )


@router.post("/respond", response_model=SimulatorRespondResponse)
async def respond_to_judge(
    payload: SimulatorRespondRequest,
    session: Session = Depends(get_session)
):
    """
    Submit a participant defense to the AI Judge.
    Evaluates response, rates 0-10, awards XP, and returns next question or final verdict.
    """
    try:
        return await JudgeSimulatorService.respond(session, payload)
    except Exception as exc:
        logger.error("respond_to_judge error: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to evaluate judge defense: {str(exc)}"
        )
