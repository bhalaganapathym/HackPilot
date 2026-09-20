from datetime import datetime
import re
from typing import List, Optional, Set

from fastapi import HTTPException, status
from sqlmodel import Session, select

from app.auth import CurrentUser
from app.models.gamification import Profile as GamificationProfile
from app.models.user_profile import Follow, UserProfile
from app.schemas.gamification import ProfileResponse
from app.schemas.user_profile import (
    LeaderboardEntry,
    ProfileGamification,
    PublicProfileResponse,
    SocialSummary,
    UserProfileSummary,
    UserProfileUpdate,
)
from app.services.gamification import GamificationService


RESERVED_USERNAMES = {
    "admin",
    "api",
    "auth",
    "leaderboard",
    "login",
    "logout",
    "profile",
    "signup",
    "support",
    "u",
}


def _slugify_username(seed: str) -> str:
    base = re.sub(r"[^a-z0-9_-]+", "-", seed.lower()).strip("-_")
    base = re.sub(r"[-_]{2,}", "-", base)
    if len(base) < 3 or base in RESERVED_USERNAMES:
        base = "pilot"
    return base[:24]


def _to_summary(profile: UserProfile) -> UserProfileSummary:
    return UserProfileSummary(
        id=profile.id,
        supabase_user_id=profile.supabase_user_id,
        name=profile.name,
        username=profile.username,
        bio=profile.bio,
        linkedin_url=profile.linkedin_url,
        github_url=profile.github_url,
        avatar_url=profile.avatar_url,
    )


class UserProfileService:
    @staticmethod
    def get_by_user_id(session: Session, user_id: str) -> Optional[UserProfile]:
        return session.exec(
            select(UserProfile).where(UserProfile.supabase_user_id == user_id)
        ).first()

    @staticmethod
    def get_by_username(session: Session, username: str) -> Optional[UserProfile]:
        return session.exec(
            select(UserProfile).where(UserProfile.username == username.lower())
        ).first()

    @staticmethod
    def provision(session: Session, current_user: CurrentUser) -> UserProfile:
        profile = UserProfileService.get_by_user_id(session, current_user.supabase_user_id)
        if profile:
            if current_user.email and profile.email != current_user.email:
                profile.email = current_user.email
                profile.updated_at = datetime.utcnow()
                session.add(profile)
                session.commit()
                session.refresh(profile)
            GamificationService.get_or_create_profile(session, current_user.supabase_user_id)
            return profile

        email_prefix = (current_user.email or "").split("@")[0]
        seed = _slugify_username(email_prefix or current_user.supabase_user_id[:8])
        username = seed
        counter = 2
        while UserProfileService.get_by_username(session, username):
            username = f"{seed[:22]}{counter}"
            counter += 1

        profile = UserProfile(
            supabase_user_id=current_user.supabase_user_id,
            email=current_user.email,
            name=email_prefix.replace(".", " ").replace("_", " ").title() if email_prefix else "",
            username=username,
        )
        session.add(profile)
        session.commit()
        session.refresh(profile)
        GamificationService.get_or_create_profile(session, current_user.supabase_user_id)
        return profile

    @staticmethod
    def update_current(
        session: Session,
        current_user: CurrentUser,
        payload: UserProfileUpdate,
    ) -> UserProfile:
        profile = UserProfileService.provision(session, current_user)
        if payload.username in RESERVED_USERNAMES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="That username is reserved.",
            )

        existing = UserProfileService.get_by_username(session, payload.username)
        if existing and existing.supabase_user_id != current_user.supabase_user_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="That username is already taken.",
            )

        profile.name = payload.name.strip()
        profile.username = payload.username
        profile.bio = payload.bio.strip()
        profile.linkedin_url = str(payload.linkedin_url) if payload.linkedin_url else None
        profile.github_url = str(payload.github_url) if payload.github_url else None
        profile.updated_at = datetime.utcnow()
        session.add(profile)
        session.commit()
        session.refresh(profile)
        return profile

    @staticmethod
    def set_avatar(session: Session, current_user: CurrentUser, avatar_url: Optional[str]) -> UserProfile:
        profile = UserProfileService.provision(session, current_user)
        profile.avatar_url = avatar_url
        profile.updated_at = datetime.utcnow()
        session.add(profile)
        session.commit()
        session.refresh(profile)
        return profile

    @staticmethod
    def get_social_summary(
        session: Session,
        target_user_id: str,
        current_user_id: Optional[str] = None,
    ) -> SocialSummary:
        followers = list(session.exec(
            select(Follow).where(Follow.following_user_id == target_user_id)
        ).all())
        following = list(session.exec(
            select(Follow).where(Follow.follower_user_id == target_user_id)
        ).all())

        relationship = "none"
        if current_user_id and current_user_id != target_user_id:
            current_follows_target = any(f.follower_user_id == current_user_id for f in followers)
            target_follows_current = any(f.following_user_id == current_user_id for f in following)
            if current_follows_target and target_follows_current:
                relationship = "friends"
            elif current_follows_target:
                relationship = "following"
            else:
                relationship = "follow"

        return SocialSummary(
            followers_count=len(followers),
            following_count=len(following),
            relationship=relationship,
        )

    @staticmethod
    def gamification_summary(full: ProfileResponse) -> ProfileGamification:
        earned_badges = [badge for badge in full.badges if badge.unlocked]
        return ProfileGamification(
            total_xp=full.total_xp,
            level=full.level,
            current_level_xp=full.current_level_xp,
            next_level_xp=full.next_level_xp,
            progress_percent=full.progress_percent,
            current_streak=full.streak_days,
            longest_streak=None,
            quests_completed=full.quests_completed,
            badges=full.badges,
            achievements=earned_badges,
        )

    @staticmethod
    def public_response(
        session: Session,
        profile: UserProfile,
        current_user_id: Optional[str] = None,
    ) -> PublicProfileResponse:
        game = GamificationService.get_full_profile(session, profile.supabase_user_id)
        return PublicProfileResponse(
            id=profile.id,
            supabase_user_id=profile.supabase_user_id,
            email=profile.email if current_user_id == profile.supabase_user_id else None,
            name=profile.name,
            username=profile.username,
            bio=profile.bio,
            linkedin_url=profile.linkedin_url,
            github_url=profile.github_url,
            avatar_url=profile.avatar_url,
            profile_url=f"/u?username={profile.username}",
            created_at=profile.created_at,
            updated_at=profile.updated_at,
            social=UserProfileService.get_social_summary(
                session,
                profile.supabase_user_id,
                current_user_id,
            ),
            gamification=UserProfileService.gamification_summary(game),
            is_current_user=current_user_id == profile.supabase_user_id,
        )

    @staticmethod
    def follow(session: Session, current_user: CurrentUser, username: str) -> SocialSummary:
        actor = UserProfileService.provision(session, current_user)
        target = UserProfileService.get_by_username(session, username)
        if not target:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found.")
        if target.supabase_user_id == actor.supabase_user_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot follow yourself.")

        existing = session.exec(
            select(Follow).where(
                Follow.follower_user_id == actor.supabase_user_id,
                Follow.following_user_id == target.supabase_user_id,
            )
        ).first()
        if not existing:
            session.add(Follow(
                follower_user_id=actor.supabase_user_id,
                following_user_id=target.supabase_user_id,
            ))
            session.commit()
        return UserProfileService.get_social_summary(session, target.supabase_user_id, actor.supabase_user_id)

    @staticmethod
    def unfollow(session: Session, current_user: CurrentUser, username: str) -> SocialSummary:
        actor = UserProfileService.provision(session, current_user)
        target = UserProfileService.get_by_username(session, username)
        if not target:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found.")

        existing = session.exec(
            select(Follow).where(
                Follow.follower_user_id == actor.supabase_user_id,
                Follow.following_user_id == target.supabase_user_id,
            )
        ).first()
        if existing:
            session.delete(existing)
            session.commit()
        return UserProfileService.get_social_summary(session, target.supabase_user_id, actor.supabase_user_id)

    @staticmethod
    def friend_ids(session: Session, user_id: str) -> Set[str]:
        following = {
            f.following_user_id
            for f in session.exec(select(Follow).where(Follow.follower_user_id == user_id)).all()
        }
        followers = {
            f.follower_user_id
            for f in session.exec(select(Follow).where(Follow.following_user_id == user_id)).all()
        }
        return following.intersection(followers)

    @staticmethod
    def leaderboard(
        session: Session,
        current_user_id: Optional[str],
        scope: str,
        limit: int = 50,
    ) -> List[LeaderboardEntry]:
        profiles = list(session.exec(select(UserProfile)).all())
        allowed_ids: Optional[Set[str]] = None
        if scope == "friends":
            if not current_user_id:
                return []
            allowed_ids = UserProfileService.friend_ids(session, current_user_id)
            allowed_ids.add(current_user_id)

        rows = []
        for user_profile in profiles:
            if allowed_ids is not None and user_profile.supabase_user_id not in allowed_ids:
                continue
            game = session.exec(
                select(GamificationProfile).where(
                    GamificationProfile.user_id == user_profile.supabase_user_id
                )
            ).first()
            total_xp = game.total_xp if game else 0
            level = game.level if game else 1
            streak_days = game.streak_days if game else 0
            rows.append((user_profile, total_xp, level, streak_days))

        rows.sort(key=lambda item: (-item[1], item[0].username))
        entries = []
        for index, (profile, total_xp, level, streak_days) in enumerate(rows[:limit], start=1):
            entries.append(LeaderboardEntry(
                rank=index,
                user=_to_summary(profile),
                total_xp=total_xp,
                level=level,
                streak_days=streak_days,
                relationship=UserProfileService.get_social_summary(
                    session,
                    profile.supabase_user_id,
                    current_user_id,
                ).relationship,
                is_current_user=current_user_id == profile.supabase_user_id,
            ))
        return entries
