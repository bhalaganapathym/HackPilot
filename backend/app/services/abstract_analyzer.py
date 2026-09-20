from typing import Optional
from sqlmodel import Session

from app.ai.registry import get_provider
from app.ai.prompts import ABSTRACT_ANALYZER_SYSTEM_PROMPT
from app.models.gamification import Quest
from app.schemas.abstract import (
    AbstractAnalyzeRequest,
    AbstractAnalyzeResponse,
    AbstractAnalysisOutput,
    QuestSchema
)
from app.services.submissions import SubmissionService
from app.services.gamification import GamificationService

class AbstractAnalyzerService:
    @staticmethod
    async def analyze(
        session: Session,
        request: AbstractAnalyzeRequest,
        user_id: Optional[str] = None
    ) -> AbstractAnalyzeResponse:
        provider = get_provider()
        output: AbstractAnalysisOutput = await provider.generate_json(
            feature="abstract_analyzer",
            system_prompt=ABSTRACT_ANALYZER_SYSTEM_PROMPT,
            user_text=request.abstract,
            schema=AbstractAnalysisOutput
        )

        # Calculate score delta
        score_delta: Optional[int] = None
        if request.previous_analysis_id:
            prev = SubmissionService.get_analysis(session, request.previous_analysis_id)
            if prev:
                score_delta = output.overall_score - prev.overall_score

        # Save analysis
        analysis = SubmissionService.save_analysis(
            session=session,
            submission_id=request.submission_id,
            user_id=user_id,
            overall_score=output.overall_score,
            scores=output.scores.model_dump(),
            strengths=output.strengths,
            weaknesses=[w.model_dump() for w in output.weaknesses],
            score_delta=score_delta,
            one_sentence_verdict=output.one_sentence_verdict
        )

        # Persist quests in database
        quests_response = []
        for w in output.weaknesses:
            quest = Quest(
                user_id=user_id,
                submission_id=request.submission_id,
                analysis_id=analysis.id,
                title=w.title,
                why_it_matters=w.why_it_matters,
                suggested_fix=w.suggested_fix,
                xp_reward=w.xp_reward,
                completed=False
            )
            session.add(quest)
            session.commit()
            session.refresh(quest)
            quests_response.append(QuestSchema(
                id=quest.id,
                title=quest.title,
                why_it_matters=quest.why_it_matters,
                suggested_fix=quest.suggested_fix,
                xp_reward=quest.xp_reward,
                completed=quest.completed
            ))

        # Award XP and check badges
        gamification = GamificationService.award_xp(session, 50, user_id)
        
        # Check "First Blood" badge
        b1 = GamificationService.unlock_badge(session, "first_blood", user_id)
        if b1:
            gamification.badges_unlocked.append(b1)

        # Check "Ten-Point Jump" badge
        if score_delta is not None and score_delta >= 10:
            b2 = GamificationService.unlock_badge(session, "ten_point_jump", user_id)
            if b2:
                gamification.badges_unlocked.append(b2)

        return AbstractAnalyzeResponse(
            id=analysis.id,
            overall_score=output.overall_score,
            scores=output.scores,
            strengths=output.strengths,
            weaknesses=quests_response,
            score_delta=score_delta,
            submission_id=request.submission_id,
            one_sentence_verdict=output.one_sentence_verdict,
            created_at=analysis.created_at.isoformat(),
            gamification=gamification
        )
