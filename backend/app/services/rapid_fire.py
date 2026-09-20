import uuid
import logging
from datetime import datetime
from sqlmodel import Session

from app.schemas.rapid_fire import (
    RapidFireEvaluateRequest,
    RapidFireResponse,
    RapidFireAnalysisOutput
)
from app.ai.registry import get_provider
from app.ai.prompts import RAPID_FIRE_SYSTEM_PROMPT
from app.services.gamification import GamificationService

logger = logging.getLogger("hackpilot.rapid_fire")

class RapidFireService:
    @staticmethod
    async def evaluate(session: Session, payload: RapidFireEvaluateRequest, user_id: str = None) -> RapidFireResponse:
        provider = get_provider()
        
        user_text_parts = [
            "=== PARTICIPANT 60-SECOND PITCH ===",
            payload.pitch_text,
            "",
            f"Practice Duration: {payload.time_taken_seconds} seconds"
        ]
        if payload.project_title:
            user_text_parts.append(f"Project Title: {payload.project_title}")
        if payload.abstract_context:
            user_text_parts.append(f"Existing Abstract/Context: {payload.abstract_context}")
            
        user_text = "\n".join(user_text_parts)
        
        logger.info("Evaluating 60-Second Rapid Fire pitch (%d words, %ds)", len(payload.pitch_text.split()), payload.time_taken_seconds)
        
        analysis: RapidFireAnalysisOutput = await provider.generate_json(
            feature="rapid_fire",
            system_prompt=RAPID_FIRE_SYSTEM_PROMPT,
            user_text=user_text,
            schema=RapidFireAnalysisOutput
        )
        
        # Award deterministic XP (60 XP) and badge
        gamification_result = None
        try:
            gamification_result = GamificationService.award_xp(session, 60, user_id=user_id)
            badge = GamificationService.unlock_badge(session, "rapid_fire_champ", user_id=user_id)
            if badge and gamification_result:
                gamification_result.badges_unlocked.append(badge)
        except Exception as ge:
            logger.warning("Failed to record gamification for rapid fire: %s", ge)
            
        return RapidFireResponse(
            session_id=f"rf-{uuid.uuid4().hex[:10]}",
            pitch_text=payload.pitch_text,
            time_taken_seconds=payload.time_taken_seconds,
            analysis=analysis,
            gamification=gamification_result,
            created_at=datetime.utcnow().isoformat()
        )
