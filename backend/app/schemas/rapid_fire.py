from typing import List, Optional
from pydantic import BaseModel, Field
from app.schemas.gamification import GamificationResult

class RapidFireEvaluateRequest(BaseModel):
    pitch_text: str = Field(..., min_length=15, max_length=5000, description="The participant's 60-second elevator pitch")
    submission_id: Optional[str] = Field(None, description="Optional submission ID to associate with")
    project_title: Optional[str] = Field(None, max_length=150, description="Project title if known")
    abstract_context: Optional[str] = Field(None, max_length=3000, description="Existing abstract context if available")
    time_taken_seconds: Optional[int] = Field(60, ge=1, le=180, description="Actual seconds elapsed during practice")

class RapidFireScores(BaseModel):
    problem_clarity: int = Field(..., ge=0, le=10, description="Clarity of the articulated problem (0-10)")
    solution_clarity: int = Field(..., ge=0, le=10, description="Clarity of the articulated solution (0-10)")
    differentiation: int = Field(..., ge=0, le=10, description="Strength of uniqueness and competitive moat (0-10)")
    technical_explanation: int = Field(..., ge=0, le=10, description="Technical depth without buzzword soup (0-10)")
    impact: int = Field(..., ge=0, le=10, description="Articulated user/market impact and metrics (0-10)")
    conciseness: int = Field(..., ge=0, le=10, description="Information density and economy of words (0-10)")
    judge_readiness: int = Field(..., ge=0, le=10, description="Overall readiness for demo day jury (0-10)")

class RapidFireAnalysisOutput(BaseModel):
    scores: RapidFireScores
    strengths: List[str] = Field(default_factory=list, description="Standout strengths with quoted excerpts")
    weaknesses: List[str] = Field(default_factory=list, description="Critical delivery or narrative gaps")
    specific_improvements: List[str] = Field(default_factory=list, description="Actionable tactical fixes")
    suggested_revised_opening: str = Field(..., description="A punchy 15-second hook that captures judge attention")
    suggested_revised_closing: str = Field(..., description="A memorable 10-second closing statement anchoring the demo")

class RapidFireResponse(BaseModel):
    session_id: str
    pitch_text: str
    time_taken_seconds: int
    analysis: RapidFireAnalysisOutput
    gamification: Optional[GamificationResult] = None
    created_at: str
