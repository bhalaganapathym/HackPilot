from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.db import get_session
from app.schemas.abstract import AbstractAnalyzeRequest, AbstractAnalyzeResponse
from app.services.abstract_analyzer import AbstractAnalyzerService

router = APIRouter(prefix="/abstract", tags=["abstract"])

@router.post("/analyze", response_model=AbstractAnalyzeResponse)
async def analyze_abstract(
    request: AbstractAnalyzeRequest,
    session: Session = Depends(get_session)
):
    return await AbstractAnalyzerService.analyze(session, request)
