"""
Phase F — Lambda Entry Point

Wraps the FastAPI app with the Mangum ASGI adapter so it can run
as an AWS Lambda function behind a Function URL.

Lambda sets:
  DATABASE_URL=sqlite:////tmp/hackpilot.db   (ephemeral, per instance)
  AWS_REGION, BEDROCK_MODEL_ID, etc.         (via Lambda env vars)
  AWS_PROFILE is NOT set — Lambda uses its IAM execution role automatically.
"""

from app.db import init_db
from app.main import app
from mangum import Mangum

# Initialize SQLite tables on cold start
init_db()

# Mangum converts Lambda events → ASGI → FastAPI
handler = Mangum(app, lifespan="off")
