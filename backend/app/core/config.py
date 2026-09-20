from typing import List, Union, Optional
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
import json

class Settings(BaseSettings):
    PROJECT_NAME: str = "HackPilot"
    API_V1_STR: str = "/api"
    AI_PROVIDER: str = "mock"
    DATABASE_URL: str = "sqlite:///./hackpilot.db"
    CORS_ORIGINS: Union[List[str], str] = ["http://localhost:3000"]

    # AWS Core
    AWS_REGION: str = "us-east-1"
    AWS_PROFILE: Optional[str] = None  # e.g. "hackpilot" for local dev

    # Amazon Bedrock
    BEDROCK_MODEL_ID: str = "anthropic.claude-3-5-sonnet-20241022-v2:0"
    TITAN_MODEL_ID: str = "amazon.titan-embed-text-v2:0"
    TITAN_EMBEDDING_DIMENSIONS: int = 512

    # Bedrock cost controls
    BEDROCK_MAX_TOKENS: int = 2000
    BEDROCK_TIMEOUT_SECONDS: int = 30

    # Amazon S3
    S3_BUCKET_NAME: str = "hackpilot-dev-artifacts"

    # Amazon DynamoDB
    DYNAMODB_TABLE_NAME: str = "hackpilot-dev-submissions"

    # Supabase Auth
    SUPABASE_URL: Optional[str] = None
    SUPABASE_ANON_KEY: Optional[str] = None

    # Input size limits (character counts — cost and abuse protection)
    MAX_ABSTRACT_LENGTH: int = 5000
    MAX_PROBLEM_LENGTH: int = 8000
    MAX_QUESTION_LENGTH: int = 500
    MAX_IDEA_LENGTH: int = 3000
    MAX_DEFENSE_LENGTH: int = 2000

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return ["http://localhost:3000"]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

settings = Settings()
