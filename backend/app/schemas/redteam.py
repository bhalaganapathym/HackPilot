from typing import List, Optional, Literal
from pydantic import BaseModel, Field
from app.schemas.gamification import GamificationResult

IntensityType = Literal["friendly", "fair", "ruthless"]
SeverityType = Literal["low", "medium", "high", "critical"]

class AttackVector(BaseModel):
    id: str
    domain: str
    title: str
    severity: SeverityType
    scenario: str
    typical_mitigation: str

class RedTeamAttackRequest(BaseModel):
    idea: str = Field(min_length=15)
    intensity: IntensityType = "fair"

class RedTeamAttackResponse(BaseModel):
    battle_id: str
    attacks: List[AttackVector]
    initial_hp: int = 100
    intensity: IntensityType

class RedTeamDefendRequest(BaseModel):
    attack_id: str
    defense: str = Field(min_length=5)
    idea: Optional[str] = None
    battle_id: Optional[str] = None
    current_hp: Optional[int] = 100

class RedTeamDefendResponse(BaseModel):
    attack_id: str
    rating: int = Field(ge=0, le=10)
    feedback: str
    mitigation_points: List[str] = Field(default_factory=list)
    hp_change: int
    current_hp: int
    xp_result: GamificationResult
