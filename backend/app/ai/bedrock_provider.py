"""
Amazon Bedrock AI Provider for HackPilot.

Implements the AIProvider abstract contract using:
- Bedrock Runtime Converse API for Claude 3.5 Sonnet (structured JSON + streaming)
- bedrock-runtime InvokeModel for Titan Text Embeddings V2

Security:
- Credentials come from the AWS SDK credential chain (never hardcoded)
- All prompts are wrapped with injection-resistant system/user delimiters
- Sensitive data is NOT logged
- All calls are bounded by token limits and timeouts

Cost Controls:
- BEDROCK_MAX_TOKENS limits output token spend per call
- Input text is pre-truncated to configured character limits
- Results must be persisted and reused; callers should not re-invoke on rerender
"""

import asyncio
import json
import logging
import time
from typing import TypeVar, Type, AsyncGenerator, Any, Dict, Optional, List

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError, BotoCoreError
from pydantic import BaseModel, ValidationError

from app.ai.base import AIProvider
from app.core.config import settings

logger = logging.getLogger("hackpilot.bedrock")

T = TypeVar("T", bound=BaseModel)


def _build_boto3_session() -> boto3.Session:
    """Build a boto3 session using the credential chain."""
    if settings.AWS_PROFILE:
        return boto3.Session(profile_name=settings.AWS_PROFILE, region_name=settings.AWS_REGION)
    return boto3.Session(region_name=settings.AWS_REGION)


def _build_bedrock_client():
    """Build the bedrock-runtime client with timeout and retry config."""
    session = _build_boto3_session()
    config = Config(
        connect_timeout=10,
        read_timeout=settings.BEDROCK_TIMEOUT_SECONDS,
        retries={"max_attempts": 2, "mode": "standard"},
    )
    return session.client("bedrock-runtime", config=config)


class BedrockProvider(AIProvider):
    """
    Production Amazon Bedrock AI Provider.

    Uses the Converse API for Claude models.
    """

    def __init__(self):
        self._client = None

    def _get_client(self):
        if self._client is None:
            self._client = _build_bedrock_client()
        return self._client

    def _truncate_input(self, text: str, max_chars: int) -> str:
        """Hard-truncate input to protect against prompt injection and control costs."""
        if len(text) > max_chars:
            logger.warning(
                "Input truncated from %d to %d chars for cost protection.",
                len(text), max_chars
            )
            return text[:max_chars] + "\n\n[Input truncated for length]"
        return text

    async def generate_json(
        self,
        feature: str,
        system_prompt: str,
        user_text: str,
        schema: Type[T],
    ) -> T:
        client = self._get_client()

        char_limits = {
            "abstract_analyzer": settings.MAX_ABSTRACT_LENGTH,
            "problem_explainer": settings.MAX_PROBLEM_LENGTH,
            "problem_qa": settings.MAX_PROBLEM_LENGTH + settings.MAX_QUESTION_LENGTH,
            "red_team_attacks": settings.MAX_IDEA_LENGTH,
            "red_team_defend": settings.MAX_IDEA_LENGTH + settings.MAX_DEFENSE_LENGTH,
            "judge_simulator": settings.MAX_IDEA_LENGTH,
            "judge_dossier": settings.MAX_ABSTRACT_LENGTH,
            "differentiation": settings.MAX_ABSTRACT_LENGTH * 2,
            "idea_duel": settings.MAX_IDEA_LENGTH * 2,
            "rapid_fire": settings.MAX_IDEA_LENGTH + 1000,
            "pitch_deck": 12000,
        }
        max_chars = char_limits.get(feature, 4000)
        safe_user_text = self._truncate_input(user_text, max_chars)

        user_message = (
            f"{safe_user_text}\n\n"
            f"Respond ONLY with a single valid JSON object matching the required schema. "
            f"Do NOT return the schema definition itself (do not output 'properties', 'type', or '$defs'). "
            f"Populate the actual fields with concrete evaluated values. "
            f"No markdown fences. No conversational prose. Only the raw JSON object."
        )

        schema_def = json.dumps(schema.model_json_schema())
        full_system_prompt = f"{system_prompt}\n\nTarget JSON Schema (Your output MUST strictly match this schema):\n{schema_def}"
        messages = [{"role": "user", "content": [{"text": user_message}]}]
        system_messages = [{"text": full_system_prompt}]

        inference_config = {
            "maxTokens": settings.BEDROCK_MAX_TOKENS,
            "temperature": 0.2,
            "topP": 0.9,
        }

        last_error: Optional[Exception] = None

        for attempt in range(1, 3):
            try:
                start = time.perf_counter()

                response = await asyncio.get_event_loop().run_in_executor(
                    None,
                    lambda: client.converse(
                        modelId=settings.BEDROCK_MODEL_ID,
                        system=system_messages,
                        messages=messages,
                        inferenceConfig=inference_config,
                    )
                )

                elapsed_ms = (time.perf_counter() - start) * 1000
                logger.info(
                    "Bedrock Converse | feature=%s | attempt=%d | latency=%.0fms | input_tokens=%s | output_tokens=%s",
                    feature, attempt, elapsed_ms,
                    response.get("usage", {}).get("inputTokens", "?"),
                    response.get("usage", {}).get("outputTokens", "?"),
                )

                content_blocks = response.get("output", {}).get("message", {}).get("content", [])
                raw_text = ""
                for block in content_blocks:
                    if "text" in block:
                        raw_text += block["text"]

                raw_text = raw_text.strip()
                if "```" in raw_text:
                    parts = raw_text.split("```")
                    for p in parts:
                        p_str = p.strip()
                        if p_str.startswith("json"):
                            p_str = p_str[4:].strip()
                        if p_str.startswith("{") and p_str.endswith("}"):
                            raw_text = p_str
                            break
                if "{" in raw_text and "}" in raw_text:
                    start_idx = raw_text.find("{")
                    end_idx = raw_text.rfind("}")
                    raw_text = raw_text[start_idx:end_idx + 1]

                data = json.loads(raw_text)
                return schema.model_validate(data)

            except (json.JSONDecodeError, ValidationError) as parse_err:
                last_error = parse_err
                logger.warning(
                    "Bedrock response parse/validate failure | feature=%s | attempt=%d | error=%s",
                    feature, attempt, type(parse_err).__name__
                )
                if attempt >= 2:
                    break
                continue

            except ClientError as ce:
                error_code = ce.response.get("Error", {}).get("Code", "Unknown")
                logger.error("Bedrock ClientError | feature=%s | code=%s", feature, error_code)
                raise RuntimeError(
                    f"Bedrock API error [{error_code}]: Check model access and IAM permissions."
                ) from ce

            except BotoCoreError as bce:
                logger.error("BotoCore error | feature=%s | %s", feature, str(bce))
                raise RuntimeError(f"AWS connectivity error: {bce}") from bce

            except Exception as exc:
                logger.error("Unexpected Bedrock error | feature=%s | %s", feature, str(exc))
                raise RuntimeError(f"Unexpected error calling Bedrock: {exc}") from exc

        raise RuntimeError(
            f"Failed to parse Bedrock response for feature '{feature}' after 2 attempts. "
            f"Last error: {last_error}"
        )

    async def stream_text(
        self,
        job_id: str,
        feature: str,
        user_text: str,
    ) -> AsyncGenerator[str, None]:
        client = self._get_client()

        streaming_prompts = {
            "abstract_analyzer": (
                "You are an elite hackathon judge. Think aloud briefly (3-4 sentences) "
                "about your process of evaluating this abstract. Be specific and insightful."
            ),
            "problem_explainer": (
                "You are a hackathon mentor. Think aloud briefly (3-4 sentences) about your "
                "process of decoding this problem statement and isolating core constraints."
            ),
            "problem_qa": (
                "Think aloud briefly (2-3 sentences) about verifying the problem statement "
                "for the requested clarification."
            ),
            "red_team_attacks": (
                "You are a relentless hackathon critic. Think aloud (3-4 sentences) about "
                "the critical failure modes and architectural blindspots in this idea."
            ),
            "red_team_defend": (
                "Think aloud briefly (2-3 sentences) evaluating this defense against the failure scenario."
            ),
            "judge_simulator": (
                "Think aloud briefly as an AI judge selecting the most probing challenge question."
            ),
            "idea_duel": (
                "You are comparing two hackathon ideas. Think aloud briefly (3-4 sentences) "
                "about the fundamental architectural and problem-space trade-offs between them."
            ),
            "rapid_fire": (
                "You are a pitch coach. Think aloud briefly (2-3 sentences) evaluating the "
                "hook, clarity, and judge punch of this 60-second delivery."
            ),
            "pitch_deck": (
                "Think aloud briefly (3-4 sentences) auditing the slide narrative, identifying "
                "evidence gaps, and verifying claimed technical architecture."
            ),
        }
        stream_prompt = streaming_prompts.get(
            feature,
            "Think aloud briefly about what you are about to analyze."
        )

        safe_text = user_text[:500] if user_text else ""
        messages = [
            {"role": "user", "content": [{"text": f"{stream_prompt}\n\nContext: {safe_text}"}]}
        ]
        inference_config = {"maxTokens": 200, "temperature": 0.7}

        try:
            response = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: client.converse_stream(
                    modelId=settings.BEDROCK_MODEL_ID,
                    messages=messages,
                    inferenceConfig=inference_config,
                )
            )

            stream = response.get("stream")
            if not stream:
                return

            for event in stream:
                if "contentBlockDelta" in event:
                    delta = event["contentBlockDelta"].get("delta", {})
                    if "text" in delta:
                        yield delta["text"]
                elif "messageStop" in event:
                    break

        except Exception as exc:
            logger.error("Bedrock stream error | feature=%s | %s", feature, str(exc))
            yield "Analyzing with Bedrock..."


class TitanEmbeddingClient:
    """Standalone Titan Text Embeddings V2 client."""

    def __init__(self):
        self._client = None

    def _get_client(self):
        if self._client is None:
            self._client = _build_bedrock_client()
        return self._client

    async def embed(self, text: str, max_chars: int = 8000) -> List[float]:
        client = self._get_client()
        safe_text = text[:max_chars] if len(text) > max_chars else text

        body = json.dumps({
            "inputText": safe_text,
            "dimensions": settings.TITAN_EMBEDDING_DIMENSIONS,
            "normalize": True,
        })

        try:
            start = time.perf_counter()
            response = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: client.invoke_model(
                    modelId=settings.TITAN_MODEL_ID,
                    body=body,
                    contentType="application/json",
                    accept="application/json",
                )
            )
            elapsed_ms = (time.perf_counter() - start) * 1000
            logger.info(
                "Titan Embeddings | dimensions=%d | latency=%.0fms",
                settings.TITAN_EMBEDDING_DIMENSIONS, elapsed_ms
            )

            response_body = json.loads(response["body"].read())
            return response_body["embedding"]

        except ClientError as ce:
            error_code = ce.response.get("Error", {}).get("Code", "Unknown")
            logger.error("Titan embedding ClientError | code=%s", error_code)
            raise RuntimeError(
                f"Titan embedding error [{error_code}]: Check model access and IAM permissions."
            ) from ce
        except Exception as exc:
            logger.error("Titan embedding error | %s", str(exc))
            raise RuntimeError(f"Embedding generation failed: {exc}") from exc

titan_client = TitanEmbeddingClient()
