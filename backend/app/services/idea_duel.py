import uuid
import logging
from datetime import datetime
from sqlmodel import Session

from app.schemas.duel import DuelRequest, DuelResponse, DuelAnalysisOutput
from app.ai.registry import get_provider
from app.ai.prompts import IDEA_DUEL_SYSTEM_PROMPT
from app.services.gamification import GamificationService

logger = logging.getLogger("hackpilot.idea_duel")

class IdeaDuelService:
    @staticmethod
    async def analyze(session: Session, payload: DuelRequest, user_id: str = None) -> DuelResponse:
        provider = get_provider()
        
        user_text_parts = [
            f"=== IDEA A ===",
            f"Title: {payload.idea_a.title}",
            f"Description: {payload.idea_a.description}",
        ]
        if payload.idea_a.tech_stack:
            user_text_parts.append(f"Proposed Tech Stack: {payload.idea_a.tech_stack}")
        if payload.idea_a.target_users:
            user_text_parts.append(f"Target Audience: {payload.idea_a.target_users}")
            
        user_text_parts.extend([
            "",
            f"=== IDEA B ===",
            f"Title: {payload.idea_b.title}",
            f"Description: {payload.idea_b.description}",
        ])
        if payload.idea_b.tech_stack:
            user_text_parts.append(f"Proposed Tech Stack: {payload.idea_b.tech_stack}")
        if payload.idea_b.target_users:
            user_text_parts.append(f"Target Audience: {payload.idea_b.target_users}")
            
        if payload.problem_statement:
            user_text_parts.extend([
                "",
                f"=== OVERARCHING PROBLEM STATEMENT ===",
                payload.problem_statement
            ])
            
        user_text = "\n".join(user_text_parts)
        
        logger.info("Executing Idea Duel analysis between '%s' and '%s'", payload.idea_a.title, payload.idea_b.title)
        
        analysis: DuelAnalysisOutput = await provider.generate_json(
            feature="idea_duel",
            system_prompt=IDEA_DUEL_SYSTEM_PROMPT,
            user_text=user_text,
            schema=DuelAnalysisOutput
        )
        
        # Award deterministic XP (50 XP for completing a duel) and badge
        gamification_result = None
        try:
            gamification_result = GamificationService.award_xp(session, 50, user_id=user_id)
            badge = GamificationService.unlock_badge(session, "idea_duelist", user_id=user_id)
            if badge and gamification_result:
                gamification_result.badges_unlocked.append(badge)
        except Exception as ge:
            logger.warning("Failed to record gamification for duel: %s", ge)
            
        return DuelResponse(
            duel_id=f"duel-{uuid.uuid4().hex[:10]}",
            analysis=analysis,
            gamification=gamification_result,
            created_at=datetime.utcnow().isoformat()
        )
