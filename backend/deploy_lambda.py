"""
Phase F — Backend Deploy Script
Packages the FastAPI app + dependencies and deploys to AWS Lambda with a Function URL.
Uses boto3 directly — no AWS CLI required.

Usage:
    python deploy_lambda.py

Outputs:
    LAMBDA_FUNCTION_URL=https://xxxx.lambda-url.us-east-1.on.aws/
"""

import os
import sys
import json
import time
import shutil
import zipfile
import subprocess
import pathlib

import boto3
from botocore.exceptions import ClientError

# ─── Config ────────────────────────────────────────────────────────────────────
PROFILE        = "hackpilot"
REGION         = "us-east-1"
ACCOUNT_ID     = "318273660064"
FUNCTION_NAME  = "hackpilot-backend"
ROLE_NAME      = "hackpilot-lambda-role"
RUNTIME        = "python3.12"
HANDLER        = "lambda_handler.handler"
MEMORY_MB      = 512
TIMEOUT_SEC    = 60
DIST_DIR       = pathlib.Path("dist")
ZIP_PATH       = pathlib.Path("hackpilot-backend.zip")

# Production env vars injected into Lambda
LAMBDA_ENV = {
    "PROJECT_NAME":            "HackPilot",
    "API_V1_STR":              "/api",
    "DATABASE_URL":            "sqlite:////tmp/hackpilot.db",
    "CORS_ORIGINS":            '["*"]',
    "AI_PROVIDER":             "bedrock",
    "BEDROCK_MODEL_ID":        "amazon.nova-pro-v1:0",
    "TITAN_MODEL_ID":          "amazon.titan-embed-text-v2:0",
    "BEDROCK_MAX_TOKENS":      "2000",
    "BEDROCK_TIMEOUT_SECONDS": "60",
    "DYNAMODB_TABLE_NAME":     "hackpilot-dev-submissions",
    "S3_BUCKET_NAME":          "hackpilot-dev-artifacts-318273660064",
}

# Trust + permissions policy
TRUST_POLICY = json.dumps({
    "Version": "2012-10-17",
    "Statement": [{
        "Effect": "Allow",
        "Principal": {"Service": "lambda.amazonaws.com"},
        "Action": "sts:AssumeRole"
    }]
})

PERMISSIONS_POLICY = json.dumps({
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "BedrockInvoke",
            "Effect": "Allow",
            "Action": ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
            "Resource": "*"
        },
        {
            "Sid": "DynamoDB",
            "Effect": "Allow",
            "Action": [
                "dynamodb:PutItem","dynamodb:GetItem","dynamodb:UpdateItem",
                "dynamodb:DeleteItem","dynamodb:Query","dynamodb:Scan"
            ],
            "Resource": f"arn:aws:dynamodb:{REGION}:{ACCOUNT_ID}:table/hackpilot-dev-submissions"
        },
        {
            "Sid": "S3Artifacts",
            "Effect": "Allow",
            "Action": ["s3:PutObject","s3:GetObject","s3:DeleteObject","s3:ListBucket"],
            "Resource": [
                f"arn:aws:s3:::hackpilot-dev-artifacts-{ACCOUNT_ID}",
                f"arn:aws:s3:::hackpilot-dev-artifacts-{ACCOUNT_ID}/*"
            ]
        },
        {
            "Sid": "CloudWatchLogs",
            "Effect": "Allow",
            "Action": ["logs:CreateLogGroup","logs:CreateLogStream","logs:PutLogEvents"],
            "Resource": "*"
        }
    ]
})


def log(msg):
    print(f"[deploy] {msg}", flush=True)


def get_session():
    return boto3.Session(profile_name=PROFILE, region_name=REGION)


# ─── Step 1: IAM Role ──────────────────────────────────────────────────────────
def ensure_iam_role(iam) -> str:
    role_arn = f"arn:aws:iam::{ACCOUNT_ID}:role/{ROLE_NAME}"
    try:
        iam.get_role(RoleName=ROLE_NAME)
        log(f"IAM role already exists: {role_arn}")
    except ClientError as e:
        if e.response["Error"]["Code"] == "NoSuchEntity":
            log(f"Creating IAM role: {ROLE_NAME}")
            iam.create_role(
                RoleName=ROLE_NAME,
                AssumeRolePolicyDocument=TRUST_POLICY,
                Description="HackPilot Lambda execution role",
            )
            log("Attaching permissions policy...")
            iam.put_role_policy(
                RoleName=ROLE_NAME,
                PolicyName="hackpilot-lambda-policy",
                PolicyDocument=PERMISSIONS_POLICY,
            )
            # Also attach basic Lambda execution policy
            iam.attach_role_policy(
                RoleName=ROLE_NAME,
                PolicyArn="arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
            )
            log("Waiting 15s for IAM role to propagate...")
            time.sleep(15)
        else:
            raise
    return role_arn


# ─── Step 2: Package ──────────────────────────────────────────────────────────
# ─── Step 2: Package ──────────────────────────────────────────────────────────
def build_package():
    if ZIP_PATH.exists() and ZIP_PATH.stat().st_size > 50 * 1024 * 1024:
        size_mb = ZIP_PATH.stat().st_size / 1024 / 1024
        log(f"Reusing existing package {ZIP_PATH} ({size_mb:.1f} MB)")
        return

    log("Cleaning previous dist...")
    if DIST_DIR.exists():
        shutil.rmtree(DIST_DIR)
    DIST_DIR.mkdir()

    log("Installing dependencies into dist/ ...")
    python = sys.executable
    result = subprocess.run(
        [python, "-m", "pip", "install", "-r", "requirements.txt", "-t", str(DIST_DIR),
         "--quiet", "--no-cache-dir"],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        print("pip error:", result.stderr)
        sys.exit(1)
    log("Dependencies installed.")

    # Copy app source
    log("Copying app source...")
    app_src = pathlib.Path("app")
    app_dst = DIST_DIR / "app"
    if app_dst.exists():
        shutil.rmtree(app_dst)
    shutil.copytree(app_src, app_dst)

    # Copy handler
    shutil.copy("lambda_handler.py", DIST_DIR / "lambda_handler.py")

    log(f"Zipping to {ZIP_PATH}...")
    if ZIP_PATH.exists():
        ZIP_PATH.unlink()
    with zipfile.ZipFile(ZIP_PATH, "w", zipfile.ZIP_DEFLATED) as zf:
        for file in DIST_DIR.rglob("*"):
            if file.is_file():
                arcname = file.relative_to(DIST_DIR)
                zf.write(file, arcname)

    size_mb = ZIP_PATH.stat().st_size / 1024 / 1024
    log(f"Package size: {size_mb:.1f} MB")


# ─── Step 3: Upload zip to S3 ─────────────────────────────────────────────────
S3_BUCKET_DEPLOY = f"hackpilot-dev-artifacts-{ACCOUNT_ID}"
S3_KEY_DEPLOY    = "deployments/hackpilot-backend.zip"

def upload_zip_to_s3(session, zip_path: pathlib.Path) -> dict:
    """Upload large zip to S3 and return S3Location dict for Lambda."""
    s3 = session.client("s3", region_name=REGION)
    try:
        head = s3.head_object(Bucket=S3_BUCKET_DEPLOY, Key=S3_KEY_DEPLOY)
        log(f"Found existing S3 object: s3://{S3_BUCKET_DEPLOY}/{S3_KEY_DEPLOY} ({head['ContentLength']/1024/1024:.1f} MB) - reusing!")
        return {"S3Bucket": S3_BUCKET_DEPLOY, "S3Key": S3_KEY_DEPLOY}
    except Exception:
        pass

    log(f"Uploading {zip_path.stat().st_size/1024/1024:.1f} MB to s3://{S3_BUCKET_DEPLOY}/{S3_KEY_DEPLOY} ...")
    s3.upload_file(str(zip_path), S3_BUCKET_DEPLOY, S3_KEY_DEPLOY)
    log("S3 upload complete.")
    return {"S3Bucket": S3_BUCKET_DEPLOY, "S3Key": S3_KEY_DEPLOY}


# ─── Step 4: Lambda ───────────────────────────────────────────────────────────
def deploy_lambda(lam, role_arn: str, s3_location: dict) -> str:
    env_config = {"Variables": LAMBDA_ENV}

    try:
        lam.get_function(FunctionName=FUNCTION_NAME)
        log(f"Updating existing Lambda function: {FUNCTION_NAME}")
        lam.update_function_code(
            FunctionName=FUNCTION_NAME,
            S3Bucket=s3_location["S3Bucket"],
            S3Key=s3_location["S3Key"],
        )
        # Wait for update to complete
        waiter = lam.get_waiter("function_updated_v2")
        waiter.wait(FunctionName=FUNCTION_NAME)
        lam.update_function_configuration(
            FunctionName=FUNCTION_NAME,
            Environment=env_config,
            Timeout=TIMEOUT_SEC,
            MemorySize=MEMORY_MB,
        )
        waiter.wait(FunctionName=FUNCTION_NAME)
        log("Lambda updated.")

    except ClientError as e:
        if e.response["Error"]["Code"] == "ResourceNotFoundException":
            log(f"Creating Lambda function: {FUNCTION_NAME}")
            lam.create_function(
                FunctionName=FUNCTION_NAME,
                Runtime=RUNTIME,
                Role=role_arn,
                Handler=HANDLER,
                Code=s3_location,
                Environment=env_config,
                Timeout=TIMEOUT_SEC,
                MemorySize=MEMORY_MB,
                Description="HackPilot FastAPI backend via Mangum",
            )
            log("Waiting for function to become active...")
            waiter = lam.get_waiter("function_active_v2")
            waiter.wait(FunctionName=FUNCTION_NAME)
            log("Lambda created and active.")
        else:
            raise

    return FUNCTION_NAME



# ─── Step 4: Function URL ─────────────────────────────────────────────────────
def ensure_function_url(lam) -> str:
    try:
        resp = lam.get_function_url_config(FunctionName=FUNCTION_NAME)
        url = resp["FunctionUrl"]
        log(f"Function URL already exists: {url}")
    except ClientError as e:
        if e.response["Error"]["Code"] == "ResourceNotFoundException":
            log("Creating Function URL (auth=NONE for public access)...")
            resp = lam.create_function_url_config(
                FunctionName=FUNCTION_NAME,
                AuthType="NONE",
                Cors={
                    "AllowCredentials": False,
                    "AllowHeaders": ["*"],
                    "AllowMethods": ["*"],
                    "AllowOrigins": ["*"],
                    "MaxAge": 86400,
                },
            )
            url = resp["FunctionUrl"]
            log("Adding public resource-based policy...")
            try:
                lam.add_permission(
                    FunctionName=FUNCTION_NAME,
                    StatementId="FunctionURLAllowPublicAccess",
                    Action="lambda:InvokeFunctionUrl",
                    Principal="*",
                    FunctionUrlAuthType="NONE",
                )
            except ClientError as pe:
                if pe.response["Error"]["Code"] != "ResourceConflictException":
                    raise
            log(f"Function URL created: {url}")
        else:
            raise
    return url


# ─── Main ─────────────────────────────────────────────────────────────────────
def main():
    log("=== HackPilot Backend Deploy ===")
    session = get_session()
    iam = session.client("iam")
    lam = session.client("lambda", region_name=REGION)

    log("--- Step 1/4: IAM Role ---")
    role_arn = ensure_iam_role(iam)

    log("--- Step 2/4: Package ---")
    build_package()   # builds dist/ and hackpilot-backend.zip

    log("--- Step 3/4: Upload zip to S3 & deploy Lambda ---")
    s3_location = upload_zip_to_s3(session, ZIP_PATH)
    deploy_lambda(lam, role_arn, s3_location)

    log("--- Step 4/4: Function URL ---")
    url = ensure_function_url(lam)

    print("\n" + "="*60)
    print(f"✅ Backend deployed!")
    print(f"   LAMBDA_FUNCTION_URL = {url}")
    print(f"   Health check: {url}api/health")
    print("="*60)

    # Write URL to file for use by next scripts
    with open("lambda_url.txt", "w") as f:
        f.write(url.rstrip("/"))
    log("URL saved to backend/lambda_url.txt")



if __name__ == "__main__":
    main()
