from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

class SubmissionCreate(BaseModel):
    title: str = Field(min_length=3)
    abstract: str = Field(min_length=15)
    team_name: Optional[str] = "Team HackPilot"
    problem_statement: Optional[str] = None
    problem_statement_id: Optional[str] = None
    user_id: Optional[str] = None

class SubmissionResponse(BaseModel):
    id: str
    title: str
    team_name: Optional[str] = "Team HackPilot"
    problem_statement: Optional[str] = None
    abstract: str
    problem_statement_id: Optional[str] = None
    status: str = "submitted"
    domain_cluster: Optional[str] = None
    embedding_status: str = "pending"
    similarity_status: str = "pending"
    created_at: datetime
    latest_scores: Optional[Dict[str, Any]] = None
    latest_analysis_id: Optional[str] = None
    user_id: Optional[str] = None
