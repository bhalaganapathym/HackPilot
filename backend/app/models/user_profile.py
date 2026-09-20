from datetime import datetime
from typing import Optional
import uuid

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, SQLModel


class UserProfile(SQLModel, table=True):
    __tablename__ = "user_profiles"
    __table_args__ = (
        UniqueConstraint("supabase_user_id", name="uq_user_profiles_supabase_user_id"),
        UniqueConstraint("username", name="uq_user_profiles_username"),
    )

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    supabase_user_id: str = Field(index=True)
    email: Optional[str] = Field(default=None, nullable=True)
    name: str = Field(default="")
    username: str = Field(index=True)
    bio: str = Field(default="")
    linkedin_url: Optional[str] = Field(default=None, nullable=True)
    github_url: Optional[str] = Field(default=None, nullable=True)
    avatar_url: Optional[str] = Field(default=None, nullable=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class Follow(SQLModel, table=True):
    __tablename__ = "follows"
    __table_args__ = (
        UniqueConstraint(
            "follower_user_id",
            "following_user_id",
            name="uq_follows_follower_following",
        ),
    )

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    follower_user_id: str = Field(index=True)
    following_user_id: str = Field(index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
