import pytest
from unittest.mock import MagicMock, patch
from app.ai.bedrock_provider import BedrockProvider
from app.core.config import settings
from app.schemas.abstract import AbstractAnalysisOutput

def test_bedrock_provider_input_truncation():
    provider = BedrockProvider()
    long_text = "A" * 6000
    truncated = provider._truncate_input(long_text, 5000)
    assert len(truncated) < 6000
    assert "[Input truncated for length]" in truncated

def test_bedrock_provider_no_truncation_when_short():
    provider = BedrockProvider()
    short_text = "Short text"
    assert provider._truncate_input(short_text, 5000) == short_text

@pytest.mark.asyncio
async def test_bedrock_provider_generate_json_success():
    provider = BedrockProvider()
    
    mock_response = {
        "output": {
            "message": {
                "content": [{
                    "text": '''{
                        "overall_score": 85,
                        "scores": {
                            "clarity": {"score": 9, "evidence": ["clear problem"], "verdict": "Solid"},
                            "completeness": {"score": 8, "evidence": ["includes stack"], "verdict": "Good"},
                            "structure": {"score": 9, "evidence": ["logical flow"], "verdict": "Well structured"},
                            "technical_depth": {"score": 8, "evidence": ["FastAPI and Bedrock"], "verdict": "Feasible"},
                            "impact": {"score": 8, "evidence": ["measurable metrics"], "verdict": "High impact"}
                        },
                        "strengths": ["Strong architecture", "Clear scope"],
                        "weaknesses": [
                            {"id": "w1", "title": "Add testing metrics", "why_it_matters": "Increases trust", "suggested_fix": "Add test coverage stats", "xp_reward": 50, "completed": false}
                        ],
                        "one_sentence_verdict": "Strong candidate for AWS jury review."
                    }'''
                }]
            }
        },
        "usage": {"inputTokens": 120, "outputTokens": 200}
    }
    
    mock_client = MagicMock()
    mock_client.converse.return_value = mock_response
    provider._client = mock_client
    
    result = await provider.generate_json(
        feature="abstract_analyzer",
        system_prompt="system",
        user_text="test abstract",
        schema=AbstractAnalysisOutput
    )
    
    assert isinstance(result, AbstractAnalysisOutput)
    assert result.overall_score == 85
    assert len(result.weaknesses) == 1
    assert result.weaknesses[0].title == "Add testing metrics"

@pytest.mark.asyncio
async def test_bedrock_provider_error_handling():
    provider = BedrockProvider()
    mock_client = MagicMock()
    mock_client.converse.side_effect = Exception("AWS Bedrock Unavailable")
    provider._client = mock_client
    
    with pytest.raises(RuntimeError) as exc_info:
        await provider.generate_json(
            feature="abstract_analyzer",
            system_prompt="system",
            user_text="test abstract",
            schema=AbstractAnalysisOutput
        )
    assert "Unexpected error calling Bedrock" in str(exc_info.value)
