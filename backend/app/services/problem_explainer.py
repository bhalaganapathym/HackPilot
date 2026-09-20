from typing import Optional
from sqlmodel import Session

from app.ai.registry import get_provider
from app.ai.prompts import PROBLEM_EXPLAINER_SYSTEM_PROMPT, PROBLEM_QA_SYSTEM_PROMPT
from app.schemas.problem import (
    ProblemExplainRequest,
    ProblemExplainOutput,
    ProblemAskRequest,
    ProblemAskOutput
)
from app.services.gamification import GamificationService

class ProblemExplainerService:
    @staticmethod
    async def explain(
        session: Session,
        request: ProblemExplainRequest,
        user_id: Optional[str] = None
    ) -> ProblemExplainOutput:
        provider = get_provider()
        output = await provider.generate_json(
            feature="problem_explainer",
            system_prompt=PROBLEM_EXPLAINER_SYSTEM_PROMPT,
            user_text=request.problem_statement,
            schema=ProblemExplainOutput
        )
        GamificationService.award_xp(session, 30, user_id)
        return output

    @staticmethod
    async def ask(
        session: Session,
        request: ProblemAskRequest,
        user_id: Optional[str] = None
    ) -> ProblemAskOutput:
        provider = get_provider()
        prompt_input = f"{request.problem_statement}|||{request.question}"
        output = await provider.generate_json(
            feature="problem_qa",
            system_prompt=PROBLEM_QA_SYSTEM_PROMPT,
            user_text=prompt_input,
            schema=ProblemAskOutput
        )
        # Award XP for engaging in clarifying Q&A
        GamificationService.award_xp(session, 15, user_id)
        GamificationService.unlock_badge(session, "silver_tongue", user_id)
        return output
