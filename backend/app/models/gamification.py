from typing import Optional
from datetime import datetime, date
from sqlmodel import SQLModel, Field
import uuid

class Profile(SQLModel, table=True):
    __tablename__ = "profiles"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: Optional[str] = Field(default=None, index=True, nullable=True)
    level: int = Field(default=1)
    total_xp: int = Field(default=0)
    streak_days: int = Field(default=1)
    last_active_date: Optional[date] = Field(default_factory=date.today)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Badge(SQLModel, table=True):
    __tablename__ = "badges"
    
    id: str = Field(primary_key=True)
    name: str
    description: str
    icon: str

class UserBadge(SQLModel, table=True):
    __tablename__ = "user_badges"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: Optional[str] = Field(default=None, index=True, nullable=True)
    badge_id: str = Field(foreign_key="badges.id", index=True)
    unlocked_at: datetime = Field(default_factory=datetime.utcnow)

class Quest(SQLModel, table=True):
    __tablename__ = "quests"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: Optional[str] = Field(default=None, index=True, nullable=True)
    submission_id: Optional[str] = Field(default=None, index=True, nullable=True)
    analysis_id: Optional[str] = Field(default=None, index=True, nullable=True)
    title: str
    why_it_matters: str
    suggested_fix: str
    xp_reward: int = Field(default=50)
    completed: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = Field(default=None, nullable=True)
