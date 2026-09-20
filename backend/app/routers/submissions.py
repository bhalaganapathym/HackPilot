import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlmodel import Session

from app.db import get_session
from app.schemas.submission import SubmissionCreate, SubmissionResponse
from app.schemas.judge_dossier import JudgeDossierResponse
from app.services.submissions import SubmissionService
from app.services.embedding_service import embed_submission
from app.services.judge_service import JudgeService

router = APIRouter(prefix="/submissions", tags=["submissions"])

def format_submission(s) -> SubmissionResponse:
    latest_scores = None
    if s.latest_scores:
        try:
            latest_scores = json.loads(s.latest_scores)
        except Exception:
            latest_scores = None
    return SubmissionResponse(
        id=s.id,
        title=s.title,
        team_name=s.team_name or "Team HackPilot",
        problem_statement=s.problem_statement,
        abstract=s.abstract,
        problem_statement_id=s.problem_statement_id,
        status=s.status,
        domain_cluster=s.domain_cluster,
        embedding_status=s.embedding_status,
        similarity_status=s.similarity_status,
        created_at=s.created_at,
        latest_scores=latest_scores,
        latest_analysis_id=s.latest_analysis_id,
        user_id=s.user_id
    )

@router.get("", response_model=List[SubmissionResponse])
async def get_submissions(session: Session = Depends(get_session)):
    submissions = SubmissionService.get_submissions(session)
    return [format_submission(s) for s in submissions]

@router.post("", response_model=SubmissionResponse, status_code=status.HTTP_201_CREATED)
async def create_submission(
    payload: SubmissionCreate,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session)
):
    submission = SubmissionService.create_submission(session, payload)
    # Fire-and-forget: embed the abstract with Titan immediately after creation
    background_tasks.add_task(embed_submission, session, submission.id)
    return format_submission(submission)

@router.get("/{submission_id}", response_model=SubmissionResponse)
async def get_submission(
    submission_id: str,
    session: Session = Depends(get_session)
):
    submission = SubmissionService.get_submission(session, submission_id)
    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Submission {submission_id} not found"
        )
    return format_submission(submission)

@router.get("/{submission_id}/judge-dossier", response_model=JudgeDossierResponse)
async def get_judge_dossier(
    submission_id: str,
    session: Session = Depends(get_session)
):
    """
    Fetch or generate the evidence-backed Judge Dossier and rubric for this submission.
    Returns cached dossier if available.
    """
    try:
        return await JudgeService.get_or_generate_dossier(session, submission_id, force_refresh=False)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/{submission_id}/judge-dossier", response_model=JudgeDossierResponse)
async def generate_judge_dossier(
    submission_id: str,
    session: Session = Depends(get_session)
):
    """
    Forces generation of a fresh Judge Dossier and evidence-backed rubric via Amazon Bedrock.
    """
    try:
        return await JudgeService.get_or_generate_dossier(session, submission_id, force_refresh=True)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

