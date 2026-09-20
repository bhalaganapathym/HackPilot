from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.db import get_session
from app.schemas.redteam import (
    RedTeamAttackRequest,
    RedTeamAttackResponse,
    RedTeamDefendRequest,
    RedTeamDefendResponse
)
from app.services.red_team import RedTeamService

router = APIRouter(prefix="/redteam", tags=["redteam"])

@router.post("/attack", response_model=RedTeamAttackResponse)
async def generate_attacks(
    request: RedTeamAttackRequest,
    session: Session = Depends(get_session)
):
    return await RedTeamService.generate_attacks(session, request)

@router.post("/defend", response_model=RedTeamDefendResponse)
async def defend_attack(
    request: RedTeamDefendRequest,
    session: Session = Depends(get_session)
):
    return await RedTeamService.evaluate_defense(session, request)
