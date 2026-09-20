import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.ai.registry import get_provider

router = APIRouter(prefix="/stream", tags=["streaming"])

@router.get("/{job_id}")
async def stream_thinking(job_id: str, feature: str = "abstract_analyzer"):
    provider = get_provider()

    async def event_generator():
        async for token in provider.stream_text(job_id, feature, job_id):
            payload = json.dumps({"token": token, "done": False})
            yield f"data: {payload}\n\n"
        
        # End signal
        yield f"data: {json.dumps({'token': '', 'done': True})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
