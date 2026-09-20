from typing import List, Optional, Dict
from pydantic import BaseModel, Field
from app.schemas.gamification import GamificationResult

class DimensionScore(BaseModel):
    score: int = Field(ge=0, le=10)
    evidence: List[str] = Field(default_factory=list)
    verdict: str

class ScoresDict(BaseModel):
    clarity: DimensionScore
    completeness: DimensionScore
    structure: DimensionScore
    technical_depth: DimensionScore
    impact: DimensionScore

class QuestSchema(BaseModel):
    id: str
    title: str
    why_it_matters: str
    suggested_fix: str
    xp_reward: int = 50
    completed: bool = False

class AbstractAnalyzeRequest(BaseModel):
    abstract: str = Field(min_length=10)
    submission_id: Optional[str] = None
    previous_analysis_id: Optional[str] = None

class AbstractAnalysisOutput(BaseModel):
    overall_score: int = Field(ge=0, le=100)
    scores: ScoresDict
    strengths: List[str]
    weaknesses: List[QuestSchema]
    one_sentence_verdict: str

class AbstractAnalyzeResponse(BaseModel):
    id: str
    overall_score: int
    scores: ScoresDict
    strengths: List[str]
    weaknesses: List[QuestSchema]
    score_delta: Optional[int] = None
    submission_id: Optional[str] = None
    one_sentence_verdict: str
    created_at: str
    gamification: Optional[GamificationResult] = None
