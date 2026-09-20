from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field
import uuid

class Submission(SQLModel, table=True):
    __tablename__ = "submissions"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: Optional[str] = Field(default=None, index=True, nullable=True)
    title: str
    team_name: Optional[str] = Field(default="Team HackPilot", nullable=True)
    problem_statement: Optional[str] = Field(default=None, nullable=True)
    abstract: str
    problem_statement_id: Optional[str] = Field(default=None, index=True, nullable=True)
    status: str = Field(default="submitted")  # draft, submitted, evaluated
    domain_cluster: Optional[str] = Field(default=None, nullable=True)
    embedding_status: str = Field(default="pending")  # pending, completed, failed
    similarity_status: str = Field(default="pending")  # pending, completed
    embedding_json: Optional[str] = Field(default=None, nullable=True)  # JSON-encoded 512-dim vector
    latest_scores: Optional[str] = Field(default=None, nullable=True) # JSON serialized scores dict
    latest_analysis_id: Optional[str] = Field(default=None, nullable=True)
    judge_dossier_json: Optional[str] = Field(default=None, nullable=True) # JSON serialized JudgeDossierResponse
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Analysis(SQLModel, table=True):
    __tablename__ = "analyses"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    submission_id: Optional[str] = Field(default=None, index=True, nullable=True)
    user_id: Optional[str] = Field(default=None, index=True, nullable=True)
    overall_score: int
    scores_json: str
    strengths_json: str
    weaknesses_json: str
    score_delta: Optional[int] = Field(default=None, nullable=True)
    one_sentence_verdict: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
