from fastapi import APIRouter
from app.core.config import settings

router = APIRouter()

@router.get("/health", tags=["health"])
async def get_health():
    return {
        "status": "healthy",
        "provider": settings.AI_PROVIDER,
        "version": "1.0.0",
        "service": settings.PROJECT_NAME
    }
