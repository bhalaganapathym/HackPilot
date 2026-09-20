from typing import List, Optional
from pydantic import BaseModel, Field
from app.schemas.gamification import GamificationResult

class IdeaInput(BaseModel):
    title: str = Field(..., min_length=2, max_length=150, description="Idea title")
    description: str = Field(..., min_length=10, max_length=2000, description="Idea description")
    tech_stack: Optional[str] = Field(None, max_length=500, description="Proposed technology stack")
    target_users: Optional[str] = Field(None, max_length=300, description="Target audience or user persona")

class DuelRequest(BaseModel):
    idea_a: IdeaInput
    idea_b: IdeaInput
    problem_statement: Optional[str] = Field(None, max_length=3000, description="Optional overarching problem statement")
    submission_id: Optional[str] = Field(None, description="Optional submission ID to associate with")

class IdeaEvaluation(BaseModel):
    strengths: List[str] = Field(default_factory=list, description="Core strengths of this idea")
    risks: List[str] = Field(default_factory=list, description="Primary technical or market risks")
    differentiation_signals: List[str] = Field(default_factory=list, description="Signals that distinguish this idea")
    judge_questions: List[str] = Field(default_factory=list, description="Tough questions a hackathon judge would ask")

class DimensionComparison(BaseModel):
    trade_offs: List[str] = Field(default_factory=list, description="Key trade-offs between the two approaches")
    stronger_evidence_needed: List[str] = Field(default_factory=list, description="Claims requiring stronger empirical or demo evidence")
    primary_risks: List[str] = Field(default_factory=list, description="Vulnerabilities specific to this dimension")
    area_requiring_validation: List[str] = Field(default_factory=list, description="Hypotheses that must be validated during hackathon")

class ComparisonSummary(BaseModel):
    problem_strength: DimensionComparison
    differentiation: DimensionComparison
    technical_feasibility: DimensionComparison
    impact: DimensionComparison

class DuelAnalysisOutput(BaseModel):
    idea_a: IdeaEvaluation
    idea_b: IdeaEvaluation
    comparison: ComparisonSummary
    shared_risks: List[str] = Field(default_factory=list, description="Risks shared by both concepts")
    improvement_opportunities: List[str] = Field(default_factory=list, description="Concrete ways both ideas could be elevated")

class DuelResponse(BaseModel):
    duel_id: str
    analysis: DuelAnalysisOutput
    gamification: Optional[GamificationResult] = None
    created_at: str
