from dataclasses import dataclass
import logging
from typing import Optional

import httpx
from fastapi import Depends, HTTPException, Request, status

from app.core.config import settings

logger = logging.getLogger("hackpilot.auth")


@dataclass
class CurrentUser:
    supabase_user_id: str
    email: Optional[str] = None


async def get_current_user(request: Request) -> CurrentUser:
    auth_header = request.headers.get("authorization", "")
    scheme, _, token = auth_header.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )

    if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase Auth is not configured on this backend.",
        )

    url = settings.SUPABASE_URL.rstrip("/") + "/auth/v1/user"
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.get(
                url,
                headers={
                    "apikey": settings.SUPABASE_ANON_KEY,
                    "Authorization": f"Bearer {token}",
                },
            )
    except httpx.HTTPError:
        logger.warning("Supabase token validation failed due to network/client error.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unable to validate authentication session.",
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication session.",
        )

    payload = response.json()
    user_id = payload.get("id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication session did not include a user identity.",
        )

    return CurrentUser(
        supabase_user_id=user_id,
        email=payload.get("email"),
    )


async def get_optional_current_user(request: Request) -> Optional[CurrentUser]:
    auth_header = request.headers.get("authorization")
    if not auth_header:
        return None
    try:
        return await get_current_user(request)
    except HTTPException:
        return None
