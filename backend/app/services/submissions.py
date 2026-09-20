import json
from typing import List, Optional, Dict, Any
from sqlmodel import Session, select

from app.models.submission import Submission, Analysis
from app.schemas.submission import SubmissionCreate
from app.persistence.repository import DualPersistenceRepository

class SubmissionService:
    @staticmethod
    def create_submission(
        session: Session,
        data: SubmissionCreate
    ) -> Submission:
        repo = DualPersistenceRepository(session)
        submission = Submission(
            title=data.title,
            team_name=data.team_name or "Team HackPilot",
            problem_statement=data.problem_statement,
            abstract=data.abstract,
            problem_statement_id=data.problem_statement_id,
            user_id=data.user_id,
            status="submitted",
            latest_scores=None
        )
        return repo.save_submission(submission)

    @staticmethod
    def get_submissions(
        session: Session,
        user_id: Optional[str] = None
    ) -> List[Submission]:
        repo = DualPersistenceRepository(session)
        return repo.get_submissions(user_id)

    @staticmethod
    def get_submission(
        session: Session,
        submission_id: str
    ) -> Optional[Submission]:
        repo = DualPersistenceRepository(session)
        return repo.get_submission(submission_id)

    @staticmethod
    def update_latest_scores(
        session: Session,
        submission_id: str,
        scores: Dict[str, Any],
        analysis_id: Optional[str] = None
    ) -> Optional[Submission]:
        repo = DualPersistenceRepository(session)
        submission = repo.get_submission(submission_id)
        if submission:
            submission.latest_scores = json.dumps(scores)
            if analysis_id:
                submission.latest_analysis_id = analysis_id
            submission = repo.save_submission(submission)
        return submission

    @staticmethod
    def save_analysis(
        session: Session,
        submission_id: Optional[str],
        user_id: Optional[str],
        overall_score: int,
        scores: Dict[str, Any],
        strengths: List[str],
        weaknesses: List[Dict[str, Any]],
        one_sentence_verdict: str,
        score_delta: Optional[int] = None
    ) -> Analysis:
        analysis = Analysis(
            submission_id=submission_id,
            user_id=user_id,
            overall_score=overall_score,
            scores_json=json.dumps(scores),
            strengths_json=json.dumps(strengths),
            weaknesses_json=json.dumps(weaknesses),
            score_delta=score_delta,
            one_sentence_verdict=one_sentence_verdict
        )
        session.add(analysis)
        session.commit()
        session.refresh(analysis)

        if submission_id:
            SubmissionService.update_latest_scores(session, submission_id, {
                "overall": overall_score,
                "clarity": scores.get("clarity", {}).get("score", 0),
                "completeness": scores.get("completeness", {}).get("score", 0),
                "structure": scores.get("structure", {}).get("score", 0),
                "technical_depth": scores.get("technical_depth", {}).get("score", 0),
                "impact": scores.get("impact", {}).get("score", 0),
            }, analysis_id=analysis.id)

        return analysis

    @staticmethod
    def get_analysis(
        session: Session,
        analysis_id: str
    ) -> Optional[Analysis]:
        return session.get(Analysis, analysis_id)
