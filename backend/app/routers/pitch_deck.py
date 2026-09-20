import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlmodel import Session

from app.db import get_session
from app.schemas.pitch_deck import PitchDeckResponse
from app.services.pitch_deck_analyzer import PitchDeckService

logger = logging.getLogger("hackpilot.pitch_deck_router")

router = APIRouter(prefix="/pitch-deck", tags=["pitch_deck"])

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB limit

@router.post("/analyze", response_model=PitchDeckResponse, status_code=status.HTTP_200_OK)
async def upload_and_analyze_pitch_deck(
    file: UploadFile = File(...),
    submission_id: Optional[str] = Form(None),
    force_reanalyze: bool = Form(False),
    session: Session = Depends(get_session)
):
    """
    Upload a pitch deck (PDF format, max 10MB) for structured AI analysis.
    Stores the artifact in S3, extracts slide text via pypdf,
    evaluates slide-by-slide clarity, detects evidence gaps, audits AWS usage,
    and returns categorized judge questions and prioritized recommendations.
    Caches analysis to avoid duplicate Bedrock invocations.
    """
    # 1. Validate file extension
    filename = file.filename or "presentation.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Only PDF pitch decks are supported."
        )

    # 2. Read and validate file size
    try:
        content = await file.read()
    except Exception as read_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read uploaded file: {read_err}"
        )

    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty (0 bytes)."
        )

    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of 10 MB ({len(content) / (1024 * 1024):.1f} MB uploaded)."
        )

    # 3. Analyze
    try:
        return await PitchDeckService.analyze_deck(
            session=session,
            file_bytes=content,
            file_name=filename,
            submission_id=submission_id,
            force_reanalyze=force_reanalyze
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as exc:
        logger.error("upload_and_analyze_pitch_deck error: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze pitch deck: {str(exc)}"
        )

@router.get("/submission/{submission_id}", response_model=PitchDeckResponse)
async def get_pitch_deck_by_submission(
    submission_id: str,
    session: Session = Depends(get_session)
):
    """Retrieve cached pitch deck analysis for a specific submission."""
    deck = PitchDeckService.get_by_submission(session, submission_id)
    if not deck:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No pitch deck analysis found for submission '{submission_id}'."
        )
    return deck

@router.get("/{deck_id}", response_model=PitchDeckResponse)
async def get_pitch_deck(
    deck_id: str,
    session: Session = Depends(get_session)
):
    """Retrieve previously generated pitch deck analysis by ID."""
    deck = PitchDeckService.get_deck(session, deck_id)
    if not deck:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pitch deck '{deck_id}' not found."
        )
    return deck
