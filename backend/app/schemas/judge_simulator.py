from typing import List, Optional, Literal
from pydantic import BaseModel, Field
from app.schemas.gamification import GamificationResult

JudgePersonaType = Literal["architect", "investor", "domain_expert"]

class JudgeDialogueTurn(BaseModel):
    turn_index: int
    speaker: Literal["judge", "participant"]
    content: str
    score: Optional[int] = Field(default=None, ge=0, le=10)
    feedback: Optional[str] = None

class SimulatorSessionStartRequest(BaseModel):
    submission_id: Optional[str] = None
    title: Optional[str] = None
    abstract: Optional[str] = None
    problem_statement: Optional[str] = None
    persona: JudgePersonaType = "architect"

class SimulatorStartOutput(BaseModel):
    opening_question: str = Field(..., description="The opening probing challenge question for the participant")
    question_intent: str = Field(..., description="The architectural or business capability being evaluated")

class SimulatorSessionStartResponse(BaseModel):
    session_id: str
    persona: JudgePersonaType
    persona_name: str
    persona_title: str
    opening_question: str
    question_intent: str
    turn_index: int = 1

class SimulatorRespondRequest(BaseModel):
    session_id: str
    persona: JudgePersonaType = "architect"
    answer: str = Field(min_length=5, description="The participant's defense response")
    history: List[JudgeDialogueTurn] = Field(default_factory=list)
    abstract_context: Optional[str] = None

class SimulatorEvaluationOutput(BaseModel):
    score: int = Field(..., ge=0, le=10, description="Score from 0 to 10 for the participant's defense")
    feedback: str = Field(..., description="Direct feedback on the defense: clarity, feasibility, omissions")
    mitigation_points: List[str] = Field(default_factory=list, description="Concrete suggestions to strengthen the pitch")
    followup_question: Optional[str] = Field(default=None, description="The next probing question if continuing cross-examination")
    is_concluded: bool = Field(default=False, description="Whether the cross-examination is concluded (after 3 rounds)")
    final_verdict: Optional[str] = Field(default=None, description="Final summary verdict if concluded")
    composite_score: Optional[int] = Field(default=None, ge=0, le=100, description="Overall practice grade if concluded")

class SimulatorRespondResponse(BaseModel):
    session_id: str
    turn_index: int
    score: int
    feedback: str
    mitigation_points: List[str]
    followup_question: Optional[str] = None
    is_concluded: bool = False
    final_verdict: Optional[str] = None
    composite_score: Optional[int] = None
    xp_awarded: int = 50
    gamification: Optional[GamificationResult] = None
