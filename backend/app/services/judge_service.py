"""
Phase D — Judge Dossier & Evidence-Backed Rubric Service

Synthesizes a submission's abstract, problem context, and cluster differentiators
into a structured, high-signal 1-page judge packet backed by cited evidence,
a 5-criterion rubric, and tailored live demo challenge questions with green/red flags.
"""

import json
import logging
from datetime import datetime
from typing import Optional

from sqlmodel import Session

from app.models.submission import Submission
from app.schemas.judge_dossier import (
    JudgeDossierOutput,
    JudgeDossierResponse,
    RubricCriterion,
    JudgeQuestion,
)
from app.ai.registry import get_provider
from app.persistence.repository import DualPersistenceRepository

logger = logging.getLogger("hackpilot.judge")

_JUDGE_DOSSIER_SYSTEM = """
You are the Head Judge of an elite, top-tier global hackathon (e.g. AWS AI Hackathon).
You are evaluating a project submission to produce an evidence-backed Judge Dossier for the judging panel.

Your dossier MUST strictly adhere to the target JSON schema and satisfy these criteria:

1. ONE SENTENCE SUMMARY:
   A sharp, objective executive summary of what the project does and its core value proposition.

2. OVERALL SCORE (0-100):
   A balanced, realistic composite score reflecting hackathon evaluation standards.

3. RUBRIC (Exactly 5 criteria, weights sum to 1.0):
   - "Problem-Solution Fit & Relevance" (weight 0.20)
   - "Technical Depth & Feasibility" (weight 0.25)
   - "Novelty & Differentiation" (weight 0.20)
   - "Architecture & Engineering Rigor" (weight 0.20)
   - "Real-World Impact & Viability" (weight 0.15)

   FOR EACH CRITERION:
   - score: integer from 0 to 10
   - evidence: 1 to 3 EXACT or near-exact short phrases cited directly from the submission abstract/text as proof.
   - evaluation: 2-3 sentences explaining the justification for this score based specifically on the cited evidence.

4. STANDOUT STRENGTHS:
   Top 3 concrete technical or product strengths of this project.

5. CRITICAL RISKS & BLINDSPOTS:
   Top 2-3 architectural, operational, or practical vulnerabilities the team will likely face.

6. DIFFERENTIATING FACTORS:
   2-3 distinct capabilities that set this project apart from typical hackathon ideas in its domain.

7. JUDGE CHALLENGE QUESTIONS (3-4 high-signal questions):
   Tailored for live demo day Q&A:
   - question: Sharp, probing technical or product challenge question.
   - intent: What specific capability, architecture, or edge case is being tested.
   - expected_signals: 2-3 positive indicators ("green flags") that demonstrate mastery.
   - red_flags: 2-3 warning signs ("red flags") that indicate hand-waving or superficial implementation.
""".strip()


class JudgeService:
    @staticmethod
    async def get_or_generate_dossier(
        session: Session,
        submission_id: str,
        force_refresh: bool = False
    ) -> JudgeDossierResponse:
        repo = DualPersistenceRepository(session)
        submission = repo.get_submission(submission_id)
        if not submission:
            raise ValueError(f"Submission {submission_id} not found")

        # Return cached dossier if present and refresh not requested
        if not force_refresh and submission.judge_dossier_json:
            try:
                cached = json.loads(submission.judge_dossier_json)
                logger.info("JudgeService: Returning cached dossier for %s", submission_id)
                return JudgeDossierResponse.model_validate(cached)
            except Exception as e:
                logger.warning("JudgeService: Failed to parse cached dossier: %s — regenerating", e)

        # Build context for the AI Judge
        context_parts = [
            f"Project Title: {submission.title}",
            f"Team Name: {submission.team_name or 'Team HackPilot'}",
        ]
        if submission.domain_cluster:
            context_parts.append(f"Domain Cluster: {submission.domain_cluster}")
        if submission.problem_statement:
            context_parts.append(f"Problem Statement Context: {submission.problem_statement}")
        context_parts.append(f"Project Abstract:\n{submission.abstract}")

        user_context = "\n\n".join(context_parts)

        provider = get_provider()
        logger.info("JudgeService: Generating fresh Judge Dossier for submission %s via Bedrock", submission_id)

        output: JudgeDossierOutput = await provider.generate_json(
            feature="judge_dossier",
            system_prompt=_JUDGE_DOSSIER_SYSTEM,
            user_text=user_context,
            schema=JudgeDossierOutput
        )

        dossier_response = JudgeDossierResponse(
            submission_id=submission.id,
            title=submission.title,
            team_name=submission.team_name or "Team HackPilot",
            domain_cluster=submission.domain_cluster,
            created_at=datetime.utcnow().isoformat(),
            one_sentence_summary=output.one_sentence_summary,
            overall_score=output.overall_score,
            rubric=output.rubric,
            standout_strengths=output.standout_strengths,
            critical_risks=output.critical_risks,
            differentiating_factors=output.differentiating_factors,
            judge_questions=output.judge_questions,
        )

        # Cache on submission and dual-persist
        submission.judge_dossier_json = dossier_response.model_dump_json()
        repo.save_submission(submission)
        logger.info("JudgeService: Successfully generated and saved Judge Dossier for %s", submission_id)

        return dossier_response
