from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.db import get_session
from app.models.gamification import Quest
from app.schemas.gamification import ProfileResponse, GamificationResult
from app.services.gamification import GamificationService

router = APIRouter(tags=["gamification"])

@router.get("/profile", response_model=ProfileResponse)
async def get_profile(session: Session = Depends(get_session)):
    return GamificationService.get_full_profile(session)

@router.post("/quests/{quest_id}/complete", response_model=GamificationResult)
async def complete_quest(
    quest_id: str,
    session: Session = Depends(get_session)
):
    quest = session.get(Quest, quest_id)
    if not quest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quest {quest_id} not found"
        )
    
    if quest.completed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Quest {quest_id} is already completed"
        )

    quest.completed = True
    session.add(quest)
    session.commit()

    # Award quest XP
    result = GamificationService.award_xp(session, quest.xp_reward, quest.user_id)
    
    # Check "Bug Hunter" badge
    b = GamificationService.unlock_badge(session, "bug_hunter", quest.user_id)
    if b:
        result.badges_unlocked.append(b)

    return result
