from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from app.schemas.gamification import GamificationResult

class SlideAnalysis(BaseModel):
    slide_number: int = Field(..., description="Slide index (1-indexed)")
    slide_title: str = Field(..., description="Inferred or stated title of slide")
    purpose: str = Field(..., description="Role of slide in hackathon narrative")
    clarity: str = Field(..., description="Evaluation of readability and visual flow")
    problem_communication: Optional[str] = Field(None, description="How well problem is presented")
    solution_communication: Optional[str] = Field(None, description="How well solution is presented")
    technical_explanation: Optional[str] = Field(None, description="Technical depth demonstrated")
    information_density: str = Field(..., description="Too sparse, balanced, or cluttered")
    missing_information: Optional[str] = Field(None, description="Gaps in the slide content")
    potential_judge_questions: List[str] = Field(default_factory=list, description="Questions prompted by this slide")
    improvement_suggestions: List[str] = Field(default_factory=list, description="Direct tactical improvements for this slide")

class EvidenceGap(BaseModel):
    claim: str = Field(..., description="Bold or unverified claim made in deck")
    evidence_found: str = Field(..., description="What evidence or lack thereof was detected in the text")
    status: str = Field(..., description="Evidence gap, Needs clarification, or Insufficient information")
    recommendation: str = Field(..., description="Specific proof or diagram to insert")

class CategorizedJudgeQuestions(BaseModel):
    technical: List[str] = Field(default_factory=list)
    product: List[str] = Field(default_factory=list)
    impact: List[str] = Field(default_factory=list)
    innovation: List[str] = Field(default_factory=list)
    aws: List[str] = Field(default_factory=list)
    feasibility: List[str] = Field(default_factory=list)
    scalability: List[str] = Field(default_factory=list)

class PrioritizedRecommendations(BaseModel):
    high_priority: List[str] = Field(default_factory=list, description="Must fix before judging")
    medium_priority: List[str] = Field(default_factory=list, description="Important clarity polish")
    low_priority: List[str] = Field(default_factory=list, description="Cosmetic and layout suggestions")

class DeckCategoryScores(BaseModel):
    problem_and_impact: int = Field(..., ge=0, le=100)
    innovation: int = Field(..., ge=0, le=100)
    technical_implementation: int = Field(..., ge=0, le=100)
    aws_usage: int = Field(..., ge=0, le=100)
    feasibility: int = Field(..., ge=0, le=100)
    presentation_readiness: int = Field(..., ge=0, le=100)

class DeckAnalysisOutput(BaseModel):
    slide_analyses: List[SlideAnalysis] = Field(default_factory=list)
    problem_summary: str = Field(..., description="Overall assessment of problem framing")
    solution_summary: str = Field(..., description="Overall assessment of solution articulation")
    innovation_summary: str = Field(..., description="Differentiation and novelty signals")
    technical_summary: str = Field(..., description="Architecture and engineering depth")
    aws_usage_summary: str = Field(..., description="Audit of AWS services mentioned and their roles")
    presentation_quality: str = Field(..., description="Overall narrative flow, pacing, and visual density")
    evidence_gaps: List[EvidenceGap] = Field(default_factory=list)
    judge_questions: CategorizedJudgeQuestions
    recommendations: PrioritizedRecommendations
    category_scores: DeckCategoryScores

class PitchDeckResponse(BaseModel):
    deck_id: str
    submission_id: Optional[str] = None
    file_name: str
    s3_key: str
    page_count: int
    analysis: DeckAnalysisOutput
    gamification: Optional[GamificationResult] = None
    created_at: str
