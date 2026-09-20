from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

class BadgeSchema(BaseModel):
    id: str
    name: str
    description: str
    icon: str
    unlocked: bool = False
    unlocked_at: Optional[datetime] = None

class GamificationResult(BaseModel):
    xp_gained: int
    new_total: int
    level_up: bool
    new_level: Optional[int] = None
    badges_unlocked: List[BadgeSchema] = []

class ProfileResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    level: int
    total_xp: int
    current_level_xp: int
    next_level_xp: int
    progress_percent: float
    streak_days: int
    badges: List[BadgeSchema]
    quests_completed: int
