from typing import List, Optional
from pydantic import BaseModel, Field

class RubricCriterion(BaseModel):
    name: str = Field(..., description="Criterion name, e.g. Technical Depth, Innovation, Impact")
    score: int = Field(..., ge=0, le=10, description="Score from 0 to 10")
    weight: float = Field(default=0.20, description="Weighting factor, typically 0.20")
    evidence: List[str] = Field(default_factory=list, description="Direct citations/phrases from the abstract as evidence")
    evaluation: str = Field(..., description="Judge commentary justifying the score based on evidence")

class JudgeQuestion(BaseModel):
    question: str = Field(..., description="Targeted challenge question to ask the team in live Q&A")
    intent: str = Field(..., description="What dimension or architectural risk the judge is probing")
    expected_signals: List[str] = Field(default_factory=list, description="Green flag answers indicating deep understanding")
    red_flags: List[str] = Field(default_factory=list, description="Warning sign answers indicating superficial execution")

class JudgeDossierOutput(BaseModel):
    one_sentence_summary: str = Field(..., description="Executive 1-sentence summary of the project and value proposition")
    overall_score: int = Field(..., ge=0, le=100, description="Composite score out of 100")
    rubric: List[RubricCriterion] = Field(..., description="Evidence-backed scoring breakdown across 5 dimensions")
    standout_strengths: List[str] = Field(..., description="Top 3 key technical or product strengths")
    critical_risks: List[str] = Field(..., description="Top 2-3 architectural, market, or feasibility risks")
    differentiating_factors: List[str] = Field(..., description="What separates this project from other hackathon projects in this domain")
    judge_questions: List[JudgeQuestion] = Field(..., description="3-4 high-signal questions for demo day live judging")

class JudgeDossierResponse(JudgeDossierOutput):
    submission_id: str
    title: str
    team_name: str
    domain_cluster: Optional[str] = None
    created_at: str
