from pathlib import Path
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlmodel import Session

from app.auth import CurrentUser, get_current_user, get_optional_current_user
from app.db import get_session
from app.schemas.user_profile import (
    LeaderboardResponse,
    PublicProfileResponse,
    SocialSummary,
    UserProfileUpdate,
)
from app.services.user_profiles import UserProfileService

router = APIRouter(tags=["users"])

ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}
MAX_AVATAR_BYTES = 2 * 1024 * 1024
STATIC_DIR = Path(__file__).resolve().parents[1] / "static" / "profile-images"


@router.get("/me", response_model=PublicProfileResponse)
async def get_me(
    current_user: CurrentUser = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    profile = UserProfileService.provision(session, current_user)
    return UserProfileService.public_response(session, profile, current_user.supabase_user_id)


@router.put("/me/profile", response_model=PublicProfileResponse)
async def update_me(
    payload: UserProfileUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    profile = UserProfileService.update_current(session, current_user, payload)
    return UserProfileService.public_response(session, profile, current_user.supabase_user_id)


@router.post("/me/avatar", response_model=PublicProfileResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: CurrentUser = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    suffix = ALLOWED_IMAGE_TYPES.get(file.content_type or "")
    if not suffix:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Profile picture must be JPEG, PNG, or WebP.",
        )

    content = await file.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded image is empty.")
    if len(content) > MAX_AVATAR_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Profile picture must be 2 MB or smaller.",
        )

    STATIC_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{current_user.supabase_user_id}-{uuid.uuid4().hex}{suffix}"
    path = STATIC_DIR / filename
    path.write_bytes(content)
    avatar_url = f"/static/profile-images/{filename}"
    profile = UserProfileService.set_avatar(session, current_user, avatar_url)
    return UserProfileService.public_response(session, profile, current_user.supabase_user_id)


@router.delete("/me/avatar", response_model=PublicProfileResponse)
async def delete_avatar(
    current_user: CurrentUser = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    profile = UserProfileService.set_avatar(session, current_user, None)
    return UserProfileService.public_response(session, profile, current_user.supabase_user_id)


@router.get("/u/{username}", response_model=PublicProfileResponse)
async def get_public_profile(
    username: str,
    current_user: CurrentUser | None = Depends(get_optional_current_user),
    session: Session = Depends(get_session),
):
    profile = UserProfileService.get_by_username(session, username)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found.")
    current_user_id = current_user.supabase_user_id if current_user else None
    return UserProfileService.public_response(session, profile, current_user_id)


@router.post("/u/{username}/follow", response_model=SocialSummary)
async def follow_user(
    username: str,
    current_user: CurrentUser = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return UserProfileService.follow(session, current_user, username)


@router.delete("/u/{username}/follow", response_model=SocialSummary)
async def unfollow_user(
    username: str,
    current_user: CurrentUser = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return UserProfileService.unfollow(session, current_user, username)


@router.get("/leaderboard", response_model=LeaderboardResponse)
async def get_leaderboard(
    scope: str = "global",
    current_user: CurrentUser | None = Depends(get_optional_current_user),
    session: Session = Depends(get_session),
):
    if scope not in {"global", "friends"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Scope must be global or friends.")
    current_user_id = current_user.supabase_user_id if current_user else None
    if scope == "friends" and not current_user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")
    return LeaderboardResponse(
        scope=scope,
        entries=UserProfileService.leaderboard(session, current_user_id, scope),
    )
