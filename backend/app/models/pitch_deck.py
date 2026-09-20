from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field
import uuid

class PitchDeckRecord(SQLModel, table=True):
    __tablename__ = "pitch_decks"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    submission_id: Optional[str] = Field(default=None, index=True, nullable=True)
    user_id: Optional[str] = Field(default=None, index=True, nullable=True)
    file_name: str
    s3_key: str
    page_count: int
    extracted_text: Optional[str] = Field(default=None, nullable=True)
    analysis_json: str  # JSON serialized DeckAnalysisOutput
    created_at: datetime = Field(default_factory=datetime.utcnow)
