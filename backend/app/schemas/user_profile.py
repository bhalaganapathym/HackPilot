from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, HttpUrl, field_validator

from app.schemas.gamification import BadgeSchema


USERNAME_PATTERN = r"^[a-z0-9_][a-z0-9_-]{2,29}$"


class UserProfileBase(BaseModel):
    name: str = Field(default="", max_length=80)
    username: str = Field(pattern=USERNAME_PATTERN, min_length=3, max_length=30)
    bio: str = Field(default="", max_length=280)
    linkedin_url: Optional[HttpUrl] = None
    github_url: Optional[HttpUrl] = None

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str) -> str:
        return value.strip().lower()


class UserProfileUpdate(UserProfileBase):
    pass


class UserProfileSummary(BaseModel):
    id: str
    supabase_user_id: str
    name: str
    username: str
    bio: str
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    avatar_url: Optional[str] = None


class SocialSummary(BaseModel):
    followers_count: int
    following_count: int
    relationship: str = "none"


class ProfileGamification(BaseModel):
    total_xp: int
    level: int
    current_level_xp: int
    next_level_xp: int
    progress_percent: float
    current_streak: int
    longest_streak: Optional[int] = None
    quests_completed: int
    badges: List[BadgeSchema]
    achievements: List[BadgeSchema]


class PublicProfileResponse(BaseModel):
    id: str
    supabase_user_id: str
    email: Optional[str] = None
    name: str
    username: str
    bio: str
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    avatar_url: Optional[str] = None
    profile_url: str
    created_at: datetime
    updated_at: datetime
    social: SocialSummary
    gamification: ProfileGamification
    is_current_user: bool = False


class LeaderboardEntry(BaseModel):
    rank: int
    user: UserProfileSummary
    total_xp: int
    level: int
    streak_days: int
    relationship: str = "none"
    is_current_user: bool = False


class LeaderboardResponse(BaseModel):
    scope: str
    entries: List[LeaderboardEntry]
