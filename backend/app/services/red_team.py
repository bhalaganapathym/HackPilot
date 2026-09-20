from typing import Optional, Dict, Any
from sqlmodel import Session
from pydantic import BaseModel

from app.ai.registry import get_provider
from app.ai.prompts import RED_TEAM_ATTACK_SYSTEM_PROMPT, RED_TEAM_DEFEND_SYSTEM_PROMPT
from app.schemas.redteam import (
    RedTeamAttackRequest,
    RedTeamAttackResponse,
    RedTeamDefendRequest,
    RedTeamDefendResponse
)
from app.services.gamification import GamificationService

class DefenseEvaluationRaw(BaseModel):
    attack_id: str
    rating: int
    feedback: str
    mitigation_points: list[str] = []
    hp_change: int

class RedTeamService:
    @staticmethod
    async def generate_attacks(
        session: Session,
        request: RedTeamAttackRequest,
        user_id: Optional[str] = None
    ) -> RedTeamAttackResponse:
        provider = get_provider()
        prompt_input = f"{request.intensity}|||{request.idea}"
        output = await provider.generate_json(
            feature="red_team_attacks",
            system_prompt=RED_TEAM_ATTACK_SYSTEM_PROMPT,
            user_text=prompt_input,
            schema=RedTeamAttackResponse
        )
        GamificationService.award_xp(session, 40, user_id)
        GamificationService.unlock_badge(session, "first_blood", user_id)
        return output

    @staticmethod
    async def evaluate_defense(
        session: Session,
        request: RedTeamDefendRequest,
        user_id: Optional[str] = None
    ) -> RedTeamDefendResponse:
        provider = get_provider()
        prompt_input = f"{request.attack_id}|||{request.defense}"
        raw = await provider.generate_json(
            feature="red_team_defend",
            system_prompt=RED_TEAM_DEFEND_SYSTEM_PROMPT,
            user_text=prompt_input,
            schema=DefenseEvaluationRaw
        )

        current_hp = request.current_hp if request.current_hp is not None else 100
        new_hp = max(0, min(100, current_hp + raw.hp_change))

        # Award XP based on rating
        xp_to_award = 20 + (raw.rating * 3) # 23 to 50 XP
        gamification = GamificationService.award_xp(session, xp_to_award, user_id)

        # If high defense rating and preserved HP, evaluate "Unbreakable" badge
        if raw.rating >= 8 and new_hp >= 60:
            badge = GamificationService.unlock_badge(session, "unbreakable", user_id)
            if badge:
                gamification.badges_unlocked.append(badge)

        return RedTeamDefendResponse(
            attack_id=request.attack_id,
            rating=raw.rating,
            feedback=raw.feedback,
            mitigation_points=raw.mitigation_points,
            hp_change=raw.hp_change,
            current_hp=new_hp,
            xp_result=gamification
        )
