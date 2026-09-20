"""
Phase E — Judge Simulator Service

Interactive AI Judge practice simulator allowing participants to cross-examine
their project against distinct persona archetypes (Architect, Investor, Domain Specialist)
with real-time defense ratings, adaptive follow-ups, and gamified XP rewards.
"""

import uuid
import logging
from typing import Dict, Any, List
from sqlmodel import Session

from app.models.submission import Submission
from app.schemas.judge_simulator import (
    SimulatorSessionStartRequest,
    SimulatorSessionStartResponse,
    SimulatorStartOutput,
    SimulatorRespondRequest,
    SimulatorRespondResponse,
    SimulatorEvaluationOutput,
    JudgePersonaType,
)
from app.ai.registry import get_provider
from app.services.gamification import GamificationService

logger = logging.getLogger("hackpilot.judge_simulator")

PERSONA_PROFILES = {
    "architect": {
        "name": "Dr. Aris",
        "title": "Principal Systems Architect & AWS AI Lead",
        "description": "Probes system scalability, failure modes, latency bottlenecks, and cloud architecture rigor.",
        "focus": "technical architecture, concurrency, database layout, error handling, AWS service integration",
    },
    "investor": {
        "name": "Sarah K.",
        "title": "Venture Partner & Product Strategist",
        "description": "Probes market differentiation, user adoption velocity, competitive moats, and product-market fit.",
        "focus": "target user personas, customer acquisition cost, defensibility against Big Tech, market timing",
    },
    "domain_expert": {
        "name": "Marcus T.",
        "title": "Security & Domain Integrity Specialist",
        "description": "Probes real-world edge cases, compliance, data security, and adversarial exploit scenarios.",
        "focus": "data privacy, regulatory adherence, threat modeling, operational risk, failure recovery",
    },
}

_START_PROMPT = """
You are {name}, a hackathon judge with the role of {title}.
Your evaluation focus is: {focus}.

You are reviewing the following project submission:
Project Title: {title}
Abstract: {abstract}
Problem Context: {problem}

Your task:
Craft a single, sharp, highly targeted opening challenge question for this team's live demo day Q&A.
Do NOT ask a generic question like "Tell me more about your project".
Instead, probe a specific technical, architectural, or business challenge directly relevant to their abstract.
State the intent behind why you are asking this question.
""".strip()

_RESPOND_PROMPT = """
You are {name}, a hackathon judge ({title}).
Your evaluation focus is: {focus}.

Project Context:
{abstract_context}

Previous Dialogue:
{history_text}

Participant's Defense to your last question:
"{answer}"

This is round {round_num} of 3 in the cross-examination.
{conclude_instruction}

Your task:
1. Rate this defense from 0 to 10 based on clarity, technical substance, and practical feasibility.
2. Provide concise, direct feedback explaining your rating (what was strong, what was hand-waved).
3. Provide 2-3 concrete mitigation points to improve their live pitch.
4. If this is NOT the final round: craft the next logical follow-up question digging deeper into their defense.
5. If this IS the final round: set is_concluded to true, provide a final verdict summarizing their demo readiness, and assign a composite score (0-100).
""".strip()


class JudgeSimulatorService:
    @staticmethod
    async def start_session(
        session: Session,
        payload: SimulatorSessionStartRequest
    ) -> SimulatorSessionStartResponse:
        session_id = str(uuid.uuid4())
        persona_key = payload.persona or "architect"
        persona = PERSONA_PROFILES.get(persona_key, PERSONA_PROFILES["architect"])

        title = payload.title or "Hackathon Project"
        abstract = payload.abstract or ""
        problem = payload.problem_statement or "Standard hackathon challenge statement"

        if payload.submission_id:
            sub = session.get(Submission, payload.submission_id)
            if sub:
                title = sub.title
                abstract = sub.abstract or ""
                problem = sub.problem_statement or problem

        provider = get_provider()
        prompt = _START_PROMPT.format(
            name=persona["name"],
            title=persona["title"],
            focus=persona["focus"],
            abstract=abstract[:2000],
            problem=problem[:1000],
        )

        logger.info("JudgeSimulator: Starting session %s with persona %s", session_id, persona_key)
        output: SimulatorStartOutput = await provider.generate_json(
            feature="judge_simulator_start",
            system_prompt=f"You are {persona['name']}, {persona['title']}. You are evaluating a hackathon pitch.",
            user_text=prompt,
            schema=SimulatorStartOutput
        )

        return SimulatorSessionStartResponse(
            session_id=session_id,
            persona=persona_key,
            persona_name=persona["name"],
            persona_title=persona["title"],
            opening_question=output.opening_question,
            question_intent=output.question_intent,
            turn_index=1,
        )

    @staticmethod
    async def respond(
        session: Session,
        payload: SimulatorRespondRequest
    ) -> SimulatorRespondResponse:
        persona_key = payload.persona or "architect"
        persona = PERSONA_PROFILES.get(persona_key, PERSONA_PROFILES["architect"])

        # Determine round number based on participant turns in history
        participant_turns = [t for t in payload.history if t.speaker == "participant"]
        round_num = len(participant_turns) + 1
        is_final_round = round_num >= 3

        history_lines = []
        for t in payload.history:
            prefix = persona["name"] if t.speaker == "judge" else "Participant"
            history_lines.append(f"{prefix}: {t.content}")
        history_text = "\n".join(history_lines) if history_lines else "(First round of cross-examination)"

        conclude_instruction = (
            "IMPORTANT: This IS the final round (round 3). You MUST set is_concluded to true, provide final_verdict and composite_score (0-100), and leave followup_question null."
            if is_final_round
            else "This is NOT the final round. Set is_concluded to false and craft a sharp followup_question."
        )

        prompt = _RESPOND_PROMPT.format(
            name=persona["name"],
            title=persona["title"],
            focus=persona["focus"],
            abstract_context=payload.abstract_context or "Hackathon project submission",
            history_text=history_text,
            answer=payload.answer,
            round_num=round_num,
            conclude_instruction=conclude_instruction,
        )

        provider = get_provider()
        logger.info("JudgeSimulator: Evaluating round %d for session %s", round_num, payload.session_id)

        output: SimulatorEvaluationOutput = await provider.generate_json(
            feature="judge_simulator_respond",
            system_prompt=f"You are {persona['name']}, {persona['title']}. Evaluate this hackathon defense rigorously.",
            user_text=prompt,
            schema=SimulatorEvaluationOutput
        )

        # Gamification: award XP based on defense score
        xp_gain = 75 if output.score >= 8 else 50
        if output.is_concluded:
            xp_gain += 50  # Bonus XP for completing full trial

        gamification_result = GamificationService.award_xp(
            session=session,
            amount=xp_gain,
            user_id=None
        )

        return SimulatorRespondResponse(
            session_id=payload.session_id,
            turn_index=round_num,
            score=output.score,
            feedback=output.feedback,
            mitigation_points=output.mitigation_points,
            followup_question=output.followup_question if not output.is_concluded else None,
            is_concluded=output.is_concluded,
            final_verdict=output.final_verdict,
            composite_score=output.composite_score,
            xp_awarded=xp_gain,
            gamification=gamification_result,
        )
