import io
import json
import uuid
import logging
from datetime import datetime
from typing import Optional
from sqlmodel import Session, select
from pypdf import PdfReader
import boto3

from app.schemas.pitch_deck import (
    DeckAnalysisOutput,
    PitchDeckResponse
)
from app.models.pitch_deck import PitchDeckRecord
from app.core.config import settings
from app.ai.registry import get_provider
from app.ai.prompts import PITCH_DECK_SYSTEM_PROMPT
from app.services.gamification import GamificationService

logger = logging.getLogger("hackpilot.pitch_deck")

class PitchDeckService:
    @staticmethod
    def _upload_to_s3(file_bytes: bytes, s3_key: str) -> bool:
        """Uploads PDF pitch deck to configured S3 bucket."""
        try:
            session = (
                boto3.Session(profile_name=settings.AWS_PROFILE, region_name=settings.AWS_REGION)
                if settings.AWS_PROFILE
                else boto3.Session(region_name=settings.AWS_REGION)
            )
            s3 = session.client("s3")
            s3.put_object(
                Bucket=settings.S3_BUCKET_NAME,
                Key=s3_key,
                Body=file_bytes,
                ContentType="application/pdf"
            )
            logger.info("S3 | Uploaded pitch deck to s3://%s/%s", settings.S3_BUCKET_NAME, s3_key)
            return True
        except Exception as exc:
            logger.warning("S3 | Failed to upload pitch deck: %s", exc)
            return False

    @staticmethod
    async def analyze_deck(
        session: Session,
        file_bytes: bytes,
        file_name: str,
        submission_id: Optional[str] = None,
        user_id: Optional[str] = None,
        force_reanalyze: bool = False
    ) -> PitchDeckResponse:
        # Check cache if submission_id provided and not forced
        if submission_id and not force_reanalyze:
            existing = session.exec(
                select(PitchDeckRecord)
                .where(PitchDeckRecord.submission_id == submission_id)
                .order_by(PitchDeckRecord.created_at.desc())
            ).first()
            if existing:
                logger.info("Returning cached pitch deck analysis for submission=%s", submission_id)
                return PitchDeckResponse(
                    deck_id=existing.id,
                    submission_id=existing.submission_id,
                    file_name=existing.file_name,
                    s3_key=existing.s3_key,
                    page_count=existing.page_count,
                    analysis=DeckAnalysisOutput.model_validate(json.loads(existing.analysis_json)),
                    created_at=existing.created_at.isoformat()
                )

        deck_id = f"deck-{uuid.uuid4().hex[:10]}"
        s3_key = f"pitch-decks/{submission_id or 'general'}/{deck_id}.pdf"
        
        # 1. Upload to S3
        PitchDeckService._upload_to_s3(file_bytes, s3_key)

        # 2. Extract slide text via pypdf
        try:
            reader = PdfReader(io.BytesIO(file_bytes))
            page_count = len(reader.pages)
            slide_sections = []
            for idx, page in enumerate(reader.pages):
                txt = page.extract_text() or ""
                txt = txt.strip()
                if not txt:
                    txt = "[Visual-only slide or image without extractable text]"
                slide_sections.append(f"=== SLIDE {idx + 1} ===\n{txt}")
            extracted_text = "\n\n".join(slide_sections)
        except Exception as pdf_err:
            logger.error("Failed to parse PDF pages: %s", pdf_err)
            raise ValueError(f"Could not read PDF document: {pdf_err}")

        # 3. Call AI Provider (Bedrock Nova Pro / Mock)
        provider = get_provider()
        user_text = f"FILENAME: {file_name}\nTOTAL SLIDES: {page_count}\n\n{extracted_text}"
        
        logger.info("Analyzing pitch deck '%s' with %d slides", file_name, page_count)
        analysis: DeckAnalysisOutput = await provider.generate_json(
            feature="pitch_deck",
            system_prompt=PITCH_DECK_SYSTEM_PROMPT,
            user_text=user_text,
            schema=DeckAnalysisOutput
        )

        # 4. Save record to local DB
        record = PitchDeckRecord(
            id=deck_id,
            submission_id=submission_id,
            user_id=user_id,
            file_name=file_name,
            s3_key=s3_key,
            page_count=page_count,
            extracted_text=extracted_text[:4000],
            analysis_json=analysis.model_dump_json(),
            created_at=datetime.utcnow()
        )
        session.add(record)
        session.commit()
        session.refresh(record)

        # 5. Gamification: 75 XP + Pitch Ready badge
        gamification_result = None
        try:
            gamification_result = GamificationService.award_xp(session, 75, user_id=user_id)
            badge = GamificationService.unlock_badge(session, "deck_master", user_id=user_id)
            if badge and gamification_result:
                gamification_result.badges_unlocked.append(badge)
        except Exception as ge:
            logger.warning("Failed to record gamification for pitch deck: %s", ge)

        return PitchDeckResponse(
            deck_id=record.id,
            submission_id=record.submission_id,
            file_name=record.file_name,
            s3_key=record.s3_key,
            page_count=record.page_count,
            analysis=analysis,
            gamification=gamification_result,
            created_at=record.created_at.isoformat()
        )

    @staticmethod
    def get_deck(session: Session, deck_id: str) -> Optional[PitchDeckResponse]:
        record = session.get(PitchDeckRecord, deck_id)
        if not record:
            return None
        return PitchDeckResponse(
            deck_id=record.id,
            submission_id=record.submission_id,
            file_name=record.file_name,
            s3_key=record.s3_key,
            page_count=record.page_count,
            analysis=DeckAnalysisOutput.model_validate(json.loads(record.analysis_json)),
            created_at=record.created_at.isoformat()
        )

    @staticmethod
    def get_by_submission(session: Session, submission_id: str) -> Optional[PitchDeckResponse]:
        record = session.exec(
            select(PitchDeckRecord)
            .where(PitchDeckRecord.submission_id == submission_id)
            .order_by(PitchDeckRecord.created_at.desc())
        ).first()
        if not record:
            return None
        return PitchDeckResponse(
            deck_id=record.id,
            submission_id=record.submission_id,
            file_name=record.file_name,
            s3_key=record.s3_key,
            page_count=record.page_count,
            analysis=DeckAnalysisOutput.model_validate(json.loads(record.analysis_json)),
            created_at=record.created_at.isoformat()
        )
