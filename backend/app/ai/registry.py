from app.ai.base import AIProvider
from app.ai.mock_provider import MockProvider
from app.core.config import settings

_cached_provider: AIProvider = None

def get_provider() -> AIProvider:
    """Factory to retrieve the active AI Provider.
    
    Defaults to MockProvider when AI_PROVIDER='mock'.
    Uses BedrockProvider when AI_PROVIDER='bedrock'.
    """
    global _cached_provider
    if _cached_provider is not None:
        return _cached_provider

    provider_name = settings.AI_PROVIDER.lower().strip()
    if provider_name == "mock":
        _cached_provider = MockProvider()
    elif provider_name == "bedrock":
        from app.ai.bedrock_provider import BedrockProvider
        _cached_provider = BedrockProvider()
    else:
        raise ValueError(f"Unsupported AI provider: {provider_name}")

    return _cached_provider
