from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.db import get_session
from app.schemas.problem import (
    ProblemExplainRequest,
    ProblemExplainOutput,
    ProblemAskRequest,
    ProblemAskOutput
)
from app.services.problem_explainer import ProblemExplainerService

router = APIRouter(prefix="/problem", tags=["problem"])

@router.post("/explain", response_model=ProblemExplainOutput)
async def explain_problem(
    request: ProblemExplainRequest,
    session: Session = Depends(get_session)
):
    return await ProblemExplainerService.explain(session, request)

@router.post("/ask", response_model=ProblemAskOutput)
async def ask_question(
    request: ProblemAskRequest,
    session: Session = Depends(get_session)
):
    return await ProblemExplainerService.ask(session, request)
