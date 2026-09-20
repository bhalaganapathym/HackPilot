from abc import ABC, abstractmethod
from typing import TypeVar, Type, AsyncGenerator
from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)

class AIProvider(ABC):
    """Abstract Base Class for all HackPilot AI Providers.
    
    A future BedrockProvider (Claude 3.5 Sonnet / Titan) will implement
    this exact contract as a drop-in replacement in Phase 5.
    """

    @abstractmethod
    async def generate_json(
        self,
        feature: str,
        system_prompt: str,
        user_text: str,
        schema: Type[T]
    ) -> T:
        """Generate structured JSON conforming to the given Pydantic schema."""
        pass

    @abstractmethod
    async def stream_text(
        self,
        job_id: str,
        feature: str,
        user_text: str
    ) -> AsyncGenerator[str, None]:
        """Stream token-by-token 'thinking' text for the given feature."""
        pass
