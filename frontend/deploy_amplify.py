"""
Phase F — Frontend Deploy Script
Builds Next.js as a static export and deploys to AWS Amplify via manual deployment.
Uses boto3 directly — no AWS CLI or Amplify CLI required.

Usage:
    cd e:/HackPilot-main/frontend
    python deploy_amplify.py [--lambda-url https://xxxx.lambda-url.us-east-1.on.aws/]

Outputs:
    AMPLIFY_URL=https://main.<app-id>.amplifyapp.com
"""

import os
import sys
import json
import time
import shutil
import zipfile
import pathlib
import argparse
import subprocess
import urllib.request

import boto3
from botocore.exceptions import ClientError

# ─── Config ────────────────────────────────────────────────────────────────────
PROFILE      = "hackpilot"
REGION       = "us-east-1"
ACCOUNT_ID   = "318273660064"
APP_NAME     = "hackpilot-frontend"
S3_BUCKET    = f"hackpilot-dev-artifacts-{ACCOUNT_ID}"
S3_KEY       = "deployments/hackpilot-frontend.zip"
OUT_DIR      = pathlib.Path("out")
ZIP_PATH     = pathlib.Path("hackpilot-frontend.zip")


def log(msg):
    print(f"[amplify] {msg}", flush=True)


def get_session():
    return boto3.Session(profile_name=PROFILE, region_name=REGION)


def read_env_value(name: str, *files: str) -> str | None:
    if os.environ.get(name):
        return os.environ[name]
    for file_name in files:
        path = pathlib.Path(file_name)
        if not path.exists():
            continue
        for raw_line in path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            if key.strip() == name:
                return value.strip().strip('"').strip("'")
    return None


# ─── Step 1: Read Lambda URL ──────────────────────────────────────────────────
def get_lambda_url(cli_url: str | None) -> str:
    if cli_url:
        return cli_url.rstrip("/")
    lambda_url_file = pathlib.Path("../backend/lambda_url.txt")
    if lambda_url_file.exists():
        url = lambda_url_file.read_text().strip()
        log(f"Using Lambda URL from file: {url}")
        return url
    log("WARNING: No Lambda URL provided. Using localhost fallback.")
    return "http://localhost:8000/api"


def build_frontend(lambda_url: str):
    base = lambda_url.rstrip("/")
    if base.endswith("/api"):
        api_url = base
    else:
        api_url = base + "/api"
    log(f"Building with NEXT_PUBLIC_API_URL={api_url}")

    env = {**os.environ, "NEXT_PUBLIC_API_URL": api_url}
    supabase_url = read_env_value("NEXT_PUBLIC_SUPABASE_URL", ".env.local", ".env.production")
    supabase_key = read_env_value("NEXT_PUBLIC_SUPABASE_ANON_KEY", ".env.local", ".env.production")
    if not supabase_url:
        supabase_url = read_env_value("SUPABASE_URL", "../backend/.env.production", "../backend/.env", "../backend/.env.ec2")
    if not supabase_key:
        supabase_key = read_env_value("SUPABASE_ANON_KEY", "../backend/.env.production", "../backend/.env", "../backend/.env.ec2")
    if supabase_url and supabase_key:
        env["NEXT_PUBLIC_SUPABASE_URL"] = supabase_url
        env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] = supabase_key
        log("Building with Supabase public auth config.")
    else:
        log("WARNING: Supabase public auth config not found; deployed auth UI will show setup-required state.")

    result = subprocess.run(
        ["npm", "run", "build"],
        env=env,
        capture_output=True,
        text=True,
        shell=True,
    )
    print(result.stdout[-3000:] if len(result.stdout) > 3000 else result.stdout)
    if result.returncode != 0:
        print("BUILD ERROR:", result.stderr[-2000:])
        sys.exit(1)

    if not OUT_DIR.exists():
        log("ERROR: 'out/' directory not found after build. Check next.config.mjs.")
        sys.exit(1)
    log("Build complete — 'out/' directory ready.")


# ─── Step 3: Zip ──────────────────────────────────────────────────────────────
def zip_output() -> bytes:
    log(f"Zipping {OUT_DIR}/ ...")
    if ZIP_PATH.exists():
        ZIP_PATH.unlink()
    with zipfile.ZipFile(ZIP_PATH, "w", zipfile.ZIP_DEFLATED) as zf:
        for file in OUT_DIR.rglob("*"):
            if file.is_file():
                zf.write(file, file.relative_to(OUT_DIR))
    size_mb = ZIP_PATH.stat().st_size / 1024 / 1024
    log(f"Frontend zip: {size_mb:.1f} MB")
    return ZIP_PATH.read_bytes()


# ─── Step 4: Upload to S3 ─────────────────────────────────────────────────────
def upload_to_s3(s3, zip_bytes: bytes) -> str:
    log(f"Uploading zip to s3://{S3_BUCKET}/{S3_KEY} ...")
    s3.put_object(Bucket=S3_BUCKET, Key=S3_KEY, Body=zip_bytes)
    url = f"https://{S3_BUCKET}.s3.{REGION}.amazonaws.com/{S3_KEY}"
    log(f"Uploaded: {url}")
    return url


# ─── Step 5: Amplify App ──────────────────────────────────────────────────────
def ensure_amplify_app(amplify, lambda_url: str) -> str:
    """Return app_id of existing or newly created Amplify app."""
    # Check if app already exists
    apps = amplify.list_apps(maxResults=25).get("apps", [])
    for app in apps:
        if app["name"] == APP_NAME:
            app_id = app["appId"]
            log(f"Amplify app exists: {app_id}")
            amplify.update_app(
                appId=app_id,
                environmentVariables={
                    "NEXT_PUBLIC_API_URL": lambda_url.rstrip("/") + "/api",
                    **({
                        "NEXT_PUBLIC_SUPABASE_URL": read_env_value("NEXT_PUBLIC_SUPABASE_URL", ".env.local", ".env.production")
                            or read_env_value("SUPABASE_URL", "../backend/.env.production", "../backend/.env", "../backend/.env.ec2"),
                        "NEXT_PUBLIC_SUPABASE_ANON_KEY": read_env_value("NEXT_PUBLIC_SUPABASE_ANON_KEY", ".env.local", ".env.production")
                            or read_env_value("SUPABASE_ANON_KEY", "../backend/.env.production", "../backend/.env", "../backend/.env.ec2"),
                    } if (
                        read_env_value("NEXT_PUBLIC_SUPABASE_URL", ".env.local", ".env.production")
                        or read_env_value("SUPABASE_URL", "../backend/.env.production", "../backend/.env", "../backend/.env.ec2")
                    ) and (
                        read_env_value("NEXT_PUBLIC_SUPABASE_ANON_KEY", ".env.local", ".env.production")
                        or read_env_value("SUPABASE_ANON_KEY", "../backend/.env.production", "../backend/.env", "../backend/.env.ec2")
                    ) else {}),
                },
                customRules=[],
            )
            return app_id

    log(f"Creating Amplify app: {APP_NAME}")
    resp = amplify.create_app(
        name=APP_NAME,
        description="HackPilot — AI-powered hackathon co-pilot",
        platform="WEB",
        environmentVariables={"NEXT_PUBLIC_API_URL": lambda_url.rstrip("/") + "/api"},
        customRules=[],
    )
    app_id = resp["app"]["appId"]
    log(f"Amplify app created: {app_id}")
    return app_id


# ─── Step 6: Create Branch ────────────────────────────────────────────────────
def ensure_branch(amplify, app_id: str) -> str:
    try:
        amplify.get_branch(appId=app_id, branchName="main")
        log("Branch 'main' already exists.")
    except ClientError as e:
        if "NotFoundException" in str(e) or "404" in str(e):
            log("Creating branch 'main'...")
            amplify.create_branch(appId=app_id, branchName="main", stage="PRODUCTION")
        else:
            raise
    return "main"


# ─── Step 7: Manual Deploy ────────────────────────────────────────────────────
def deploy_to_amplify(amplify, app_id: str, branch: str, s3_url: str) -> str:
    log("Creating deployment job...")
    deploy_resp = amplify.create_deployment(appId=app_id, branchName=branch)
    job_id = deploy_resp["jobId"]
    upload_url = deploy_resp["zipUploadUrl"]

    log(f"Uploading zip directly to Amplify pre-signed URL (job={job_id})...")
    zip_data = ZIP_PATH.read_bytes()
    req = urllib.request.Request(
        upload_url,
        data=zip_data,
        method="PUT",
        headers={"Content-Type": "application/zip"},
    )
    with urllib.request.urlopen(req) as r:
        log(f"Upload status: {r.status}")

    log("Starting deployment...")
    amplify.start_deployment(appId=app_id, branchName=branch, jobId=job_id)

    log("Waiting for deployment to complete (this may take 2-4 minutes)...")
    for attempt in range(40):
        time.sleep(10)
        job = amplify.get_job(appId=app_id, branchName=branch, jobId=job_id)
        status = job["job"]["summary"]["status"]
        log(f"  [{attempt+1}/40] Deployment status: {status}")
        if status == "SUCCEED":
            log("Deployment SUCCEEDED!")
            return job_id
        elif status in ("FAILED", "CANCELLED"):
            log(f"Deployment {status}. Check Amplify console for details.")
            sys.exit(1)

    log("Timeout waiting for deployment.")
    sys.exit(1)


# ─── Main ─────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--lambda-url", default=None, help="Lambda Function URL base")
    args = parser.parse_args()

    log("=== HackPilot Frontend Deploy ===")
    session = get_session()
    s3      = session.client("s3", region_name=REGION)
    amplify = session.client("amplify", region_name=REGION)

    lambda_url = get_lambda_url(args.lambda_url)

    log("--- Step 1/5: Build ---")
    build_frontend(lambda_url)

    log("--- Step 2/5: Zip ---")
    zip_output()

    log("--- Step 3/5: Upload to S3 ---")
    s3_url = upload_to_s3(s3, ZIP_PATH.read_bytes())

    log("--- Step 4/5: Amplify App ---")
    app_id = ensure_amplify_app(amplify, lambda_url)
    branch = ensure_branch(amplify, app_id)

    log("--- Step 5/5: Deploy ---")
    deploy_to_amplify(amplify, app_id, branch, s3_url)

    amplify_url = f"https://main.{app_id}.amplifyapp.com"
    print("\n" + "="*60)
    print(f"[SUCCESS] Frontend deployed!")
    print(f"   AMPLIFY_URL = {amplify_url}")
    print("="*60)

    with open("amplify_url.txt", "w", encoding="utf-8") as f:
        f.write(amplify_url)
    log("URL saved to frontend/amplify_url.txt")


if __name__ == "__main__":
    main()
