from datetime import date, datetime, timedelta
from typing import List, Tuple, Optional
from sqlmodel import Session, select

from app.models.gamification import Profile, Badge, UserBadge, Quest
from app.schemas.gamification import GamificationResult, BadgeSchema, ProfileResponse

INITIAL_BADGES = [
    {
        "id": "first_blood",
        "name": "First Blood",
        "description": "Completed your first project analysis or defensive battle.",
        "icon": "sword"
    },
    {
        "id": "bug_hunter",
        "name": "Bug Hunter",
        "description": "Resolved a weakness quest and improved your abstract.",
        "icon": "shield-check"
    },
    {
        "id": "silver_tongue",
        "name": "Silver Tongue",
        "description": "Dissected a problem statement and clarified hidden requirements.",
        "icon": "message-circle"
    },
    {
        "id": "ten_point_jump",
        "name": "Ten-Point Jump",
        "description": "Boosted your abstract score by 10 or more points in a single revision.",
        "icon": "trending-up"
    },
    {
        "id": "three_day_streak",
        "name": "3-Day Streak",
        "description": "Maintained an active mission control streak for 3 consecutive days.",
        "icon": "flame"
    },
    {
        "id": "unbreakable",
        "name": "Unbreakable",
        "description": "Repelled all Red Team attacks and preserved your survival HP.",
        "icon": "award"
    },
    {
        "id": "idea_duelist",
        "name": "Idea Jouster",
        "description": "Pitted two concepts in an Idea Duel to expose risks and differentiation.",
        "icon": "swords"
    },
    {
        "id": "rapid_fire_champ",
        "name": "Speed Demon",
        "description": "Completed a high-pressure 60-second rapid fire elevator pitch challenge.",
        "icon": "zap"
    },
    {
        "id": "deck_master",
        "name": "Pitch Ready",
        "description": "Audited a complete pitch deck artifact with AI slide and evidence gap analysis.",
        "icon": "presentation"
    }
]

class GamificationService:
    @staticmethod
    def calculate_level(total_xp: int) -> Tuple[int, int, int]:
        """Calculates current level, XP required for current level, and XP for next level.
        Formula: Threshold for level L = int(100 * (L ** 1.5))
        """
        level = 1
        while True:
            xp_next = int(100 * (level ** 1.5))
            if total_xp < xp_next:
                xp_curr = int(100 * ((level - 1) ** 1.5)) if level > 1 else 0
                return level, xp_curr, xp_next
            level += 1

    @staticmethod
    def get_or_create_profile(session: Session, user_id: Optional[str] = None) -> Profile:
        GamificationService.ensure_badges(session)
        
        statement = select(Profile)
        if user_id:
            statement = statement.where(Profile.user_id == user_id)
        profile = session.exec(statement).first()

        today = date.today()
        if not profile:
            profile = Profile(
                user_id=user_id,
                level=1,
                total_xp=0,
                streak_days=1,
                last_active_date=today
            )
            session.add(profile)
            session.commit()
            session.refresh(profile)
        else:
            # Update streak
            if profile.last_active_date:
                delta = (today - profile.last_active_date).days
                if delta == 1:
                    profile.streak_days += 1
                    profile.last_active_date = today
                    session.add(profile)
                    session.commit()
                    session.refresh(profile)
                elif delta > 1:
                    profile.streak_days = 1
                    profile.last_active_date = today
                    session.add(profile)
                    session.commit()
                    session.refresh(profile)
            else:
                profile.last_active_date = today
                session.add(profile)
                session.commit()
                session.refresh(profile)

        return profile

    @staticmethod
    def ensure_badges(session: Session):
        for b_data in INITIAL_BADGES:
            badge = session.get(Badge, b_data["id"])
            if not badge:
                badge = Badge(**b_data)
                session.add(badge)
        session.commit()

    @staticmethod
    def award_xp(
        session: Session,
        amount: int,
        user_id: Optional[str] = None
    ) -> GamificationResult:
        profile = GamificationService.get_or_create_profile(session, user_id)
        old_level = profile.level
        profile.total_xp += amount

        new_level, _, _ = GamificationService.calculate_level(profile.total_xp)
        level_up = new_level > old_level
        profile.level = new_level
        profile.updated_at = datetime.utcnow()

        session.add(profile)
        session.commit()
        session.refresh(profile)

        # Check for 3-day streak badge
        badges_unlocked: List[BadgeSchema] = []
        if profile.streak_days >= 3:
            unlocked = GamificationService.unlock_badge(session, "three_day_streak", user_id)
            if unlocked:
                badges_unlocked.append(unlocked)

        return GamificationResult(
            xp_gained=amount,
            new_total=profile.total_xp,
            level_up=level_up,
            new_level=new_level if level_up else None,
            badges_unlocked=badges_unlocked
        )

    @staticmethod
    def unlock_badge(
        session: Session,
        badge_id: str,
        user_id: Optional[str] = None
    ) -> Optional[BadgeSchema]:
        GamificationService.ensure_badges(session)
        badge = session.get(Badge, badge_id)
        if not badge:
            return None

        statement = select(UserBadge).where(UserBadge.badge_id == badge_id)
        if user_id:
            statement = statement.where(UserBadge.user_id == user_id)
        existing = session.exec(statement).first()

        if existing:
            return None

        user_badge = UserBadge(user_id=user_id, badge_id=badge_id)
        session.add(user_badge)
        session.commit()

        return BadgeSchema(
            id=badge.id,
            name=badge.name,
            description=badge.description,
            icon=badge.icon,
            unlocked=True,
            unlocked_at=user_badge.unlocked_at
        )

    @staticmethod
    def get_full_profile(session: Session, user_id: Optional[str] = None) -> ProfileResponse:
        profile = GamificationService.get_or_create_profile(session, user_id)
        level, xp_curr, xp_next = GamificationService.calculate_level(profile.total_xp)

        # Calculate progress percent in current level
        span = max(xp_next - xp_curr, 1)
        earned_in_level = max(profile.total_xp - xp_curr, 0)
        progress_pct = round(min((earned_in_level / span) * 100, 100.0), 1)

        # Retrieve badges
        GamificationService.ensure_badges(session)
        all_badges = session.exec(select(Badge)).all()

        user_badges_stmt = select(UserBadge)
        if user_id:
            user_badges_stmt = user_badges_stmt.where(UserBadge.user_id == user_id)
        user_badges = {ub.badge_id: ub.unlocked_at for ub in session.exec(user_badges_stmt).all()}

        badge_schemas = [
            BadgeSchema(
                id=b.id,
                name=b.name,
                description=b.description,
                icon=b.icon,
                unlocked=b.id in user_badges,
                unlocked_at=user_badges.get(b.id)
            )
            for b in all_badges
        ]

        # Quests completed count
        quests_stmt = select(Quest).where(Quest.completed == True)
        if user_id:
            quests_stmt = quests_stmt.where(Quest.user_id == user_id)
        quests_completed = len(session.exec(quests_stmt).all())

        return ProfileResponse(
            id=profile.id,
            user_id=profile.user_id,
            level=level,
            total_xp=profile.total_xp,
            current_level_xp=xp_curr,
            next_level_xp=xp_next,
            progress_percent=progress_pct,
            streak_days=profile.streak_days,
            badges=badge_schemas,
            quests_completed=quests_completed
        )
