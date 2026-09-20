"""
Phase F — Complete Live Deployment Script
1. Packages clean backend source + prod .env + SQLite DB
2. Uploads to S3
3. Launches/configures EC2 instance with IAM profile & security group
4. Waits for backend health check (http://<public-ip>:8000/api/health)
5. Builds Next.js frontend with backend API URL
6. Deploys frontend to AWS Amplify
7. Runs full smoke test
8. Prints live URLs
"""

import os
import sys
import json
import time
import zipfile
import pathlib
import subprocess
import urllib.request
import urllib.error

import boto3
from botocore.exceptions import ClientError

PROFILE      = "hackpilot"
REGION       = "us-east-1"
ACCOUNT_ID   = "318273660064"
S3_BUCKET    = f"hackpilot-dev-artifacts-{ACCOUNT_ID}"
S3_KEY       = "deployments/hackpilot-backend-src.zip"
SG_NAME      = "hackpilot-sg"
ROLE_NAME    = "hackpilot-ec2-role"
PROFILE_NAME = "hackpilot-ec2-profile"
AMI_ID       = "ami-0b2c9d1f3edcfd709"  # Amazon Linux 2023 x86_64
INSTANCE_TYPE = "t3.small"

def log(msg):
    print(f"[deploy-live] {msg}", flush=True)

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

# ─── 1. Package Source ────────────────────────────────────────────────────────
def package_backend():
    zip_path = pathlib.Path("hackpilot-backend-src.zip")
    log(f"Creating clean backend package: {zip_path}...")
    if zip_path.exists():
        zip_path.unlink()

    # Prod .env content (without AWS_PROFILE so IAM role is used)
    base_prod_env = """PROJECT_NAME="HackPilot"
API_V1_STR="/api"
AI_PROVIDER="bedrock"
DATABASE_URL="sqlite:///./hackpilot.db"
CORS_ORIGINS=["*"]
AWS_REGION="us-east-1"
BEDROCK_MODEL_ID="amazon.nova-pro-v1:0"
TITAN_MODEL_ID="amazon.titan-embed-text-v2:0"
BEDROCK_MAX_TOKENS=2000
BEDROCK_TIMEOUT_SECONDS=60
S3_BUCKET_NAME="hackpilot-dev-artifacts-318273660064"
DYNAMODB_TABLE_NAME="hackpilot-dev-submissions"
"""
    prod_env_lines = [base_prod_env.rstrip()]
    for key in ("SUPABASE_URL", "SUPABASE_ANON_KEY"):
        value = read_env_value(key, ".env.production", ".env", ".env.ec2")
        if value:
            prod_env_lines.append(f'{key}="{value}"')
    prod_env = "\n".join(prod_env_lines) + "\n"
    with open(".env.ec2", "w") as f:
        f.write(prod_env)

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        # Add app/
        for p in pathlib.Path("app").rglob("*"):
            if p.is_file() and "__pycache__" not in str(p) and not p.name.endswith(".pyc"):
                zf.write(p, p)
        # Add requirements.txt
        zf.write("requirements.txt", "requirements.txt")
        # Add .env
        zf.write(".env.ec2", ".env")
        # Do not package local SQLite data. The EC2 instance owns the live DB,
        # and uploading local test/dev rows would leak into production.

    size_kb = zip_path.stat().st_size / 1024
    log(f"Backend package ready: {size_kb:.1f} KB")
    return zip_path

# ─── 2. Upload to S3 ──────────────────────────────────────────────────────────
def upload_source_to_s3(session, zip_path):
    s3 = session.client("s3", region_name=REGION)
    log(f"Uploading to s3://{S3_BUCKET}/{S3_KEY}...")
    s3.upload_file(str(zip_path), S3_BUCKET, S3_KEY)
    log("Uploaded backend source to S3.")

# ─── 3. Launch or Reuse EC2 Instance ──────────────────────────────────────────
USER_DATA = f"""#!/bin/bash
exec > /var/log/user-data.log 2>&1
echo "=== Starting HackPilot Server Setup ==="
dnf update -y
dnf install -y python3.11 python3.11-pip unzip git

mkdir -p /opt/hackpilot
cd /opt/hackpilot

# Download code from S3
aws s3 cp s3://{S3_BUCKET}/{S3_KEY} backend-src.zip --region {REGION}
unzip -o backend-src.zip

# Create venv and install
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Create systemd service
cat << 'EOF' > /etc/systemd/system/hackpilot.service
[Unit]
Description=HackPilot Backend API
After=network.target

[Service]
User=root
WorkingDirectory=/opt/hackpilot
ExecStart=/opt/hackpilot/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=3
Environment="PATH=/opt/hackpilot/venv/bin:/usr/local/bin:/usr/bin:/bin"

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable hackpilot
systemctl restart hackpilot
echo "=== HackPilot Backend Setup Complete ==="
"""

def launch_backend_ec2(session):
    ec2 = session.client("ec2", region_name=REGION)

    # Check for existing running instance with tag Name=hackpilot-backend
    instances = ec2.describe_instances(
        Filters=[
            {"Name": "tag:Name", "Values": ["hackpilot-backend"]},
            {"Name": "instance-state-name", "Values": ["pending", "running"]}
        ]
    )["Reservations"]

    if instances and instances[0]["Instances"]:
        inst = instances[0]["Instances"][0]
        inst_id = inst["InstanceId"]
        public_ip = inst.get("PublicIpAddress")
        log(f"Reusing existing EC2 instance {inst_id} (IP: {public_ip})")
        return inst_id, public_ip

    # Get SG ID
    sgs = ec2.describe_security_groups(Filters=[{"Name": "group-name", "Values": [SG_NAME]}])["SecurityGroups"]
    sg_id = sgs[0]["GroupId"]

    log(f"Launching new {INSTANCE_TYPE} instance with {AMI_ID}...")
    resp = ec2.run_instances(
        ImageId=AMI_ID,
        InstanceType=INSTANCE_TYPE,
        MinCount=1,
        MaxCount=1,
        SecurityGroupIds=[sg_id],
        IamInstanceProfile={"Name": PROFILE_NAME},
        UserData=USER_DATA,
        TagSpecifications=[{
            "ResourceType": "instance",
            "Tags": [{"Key": "Name", "Value": "hackpilot-backend"}]
        }]
    )

    inst_id = resp["Instances"][0]["InstanceId"]
    log(f"Instance launched: {inst_id}. Waiting for running state...")

    waiter = ec2.get_waiter("instance_running")
    waiter.wait(InstanceIds=[inst_id])

    desc = ec2.describe_instances(InstanceIds=[inst_id])["Reservations"][0]["Instances"][0]
    public_ip = desc.get("PublicIpAddress")
    log(f"Instance running! Public IP: {public_ip}")
    return inst_id, public_ip

def update_existing_backend_ec2(session, inst_id: str):
    ssm = session.client("ssm", region_name=REGION)
    log(f"Updating existing EC2 instance in-place via SSM: {inst_id}")
    commands = [
        "set -e",
        "cd /opt/hackpilot",
        f"aws s3 cp s3://{S3_BUCKET}/{S3_KEY} backend-src.zip --region {REGION}",
        "unzip -o backend-src.zip",
        "source venv/bin/activate",
        "pip install -r requirements.txt",
        "systemctl restart hackpilot",
        "systemctl status hackpilot --no-pager",
    ]
    response = ssm.send_command(
        InstanceIds=[inst_id],
        DocumentName="AWS-RunShellScript",
        Parameters={"commands": commands},
        TimeoutSeconds=300,
    )
    command_id = response["Command"]["CommandId"]
    for attempt in range(60):
        time.sleep(5)
        result = ssm.get_command_invocation(CommandId=command_id, InstanceId=inst_id)
        status = result["Status"]
        log(f"  SSM update status [{attempt + 1}/60]: {status}")
        if status == "Success":
            log("EC2 backend updated and service restarted.")
            return
        if status in ("Cancelled", "Failed", "TimedOut", "Cancelling"):
            print(result.get("StandardOutputContent", ""))
            print(result.get("StandardErrorContent", ""))
            raise RuntimeError(f"SSM backend update failed with status {status}.")
    raise TimeoutError("Timed out waiting for SSM backend update.")

# ─── 4. Wait for Health Check ─────────────────────────────────────────────────
def wait_for_health(public_ip: str):
    health_url = f"http://{public_ip}:8000/api/health"
    log(f"Waiting for backend to start at {health_url}...")

    start_time = time.time()
    for attempt in range(60):  # 60 attempts * 5 sec = 5 mins max
        try:
            req = urllib.request.Request(health_url, headers={"Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=5) as r:
                if r.status == 200:
                    data = json.loads(r.read().decode())
                    log(f"Backend is HEALTHY! (took {int(time.time() - start_time)}s)")
                    log(f"Response: {data}")
                    return health_url
        except Exception:
            pass

        time.sleep(5)
        if attempt % 4 == 0:
            log(f"  Still waiting... (attempt {attempt+1}/60)")

    raise TimeoutError("Backend health check timed out after 5 minutes.")

# ─── 5. Deploy Frontend to Amplify ────────────────────────────────────────────
def deploy_frontend(backend_api_url: str):
    log("Deploying frontend to AWS Amplify...")
    frontend_dir = pathlib.Path("../frontend").resolve()
    
    # Run deploy_amplify.py
    cmd = [sys.executable, "deploy_amplify.py", "--lambda-url", backend_api_url.replace("/api", "")]
    result = subprocess.run(cmd, cwd=str(frontend_dir), capture_output=True, text=True)
    print(result.stdout)
    if result.returncode != 0:
        print("Amplify deploy stderr:", result.stderr)
        raise RuntimeError("Amplify deployment failed.")

    # Read Amplify URL
    amp_file = frontend_dir / "amplify_url.txt"
    if amp_file.exists():
        return amp_file.read_text().strip()
    return None

# ─── Main ─────────────────────────────────────────────────────────────────────
def main():
    log("=== Phase F: HackPilot End-to-End Live Deployment ===")
    session = get_session()

    # Step 1: Package
    zip_path = package_backend()

    # Step 2: Upload
    upload_source_to_s3(session, zip_path)

    # Step 3: Launch backend EC2
    inst_id, public_ip = launch_backend_ec2(session)
    update_existing_backend_ec2(session, inst_id)

    # Save backend URL (use CloudFront HTTPS to prevent browser mixed content blocking)
    cloudfront_domain = "https://dw5virp5mxy8d.cloudfront.net"
    with open("lambda_url.txt", "w") as f:
        f.write(cloudfront_domain)

    # Step 4: Wait for health check on direct EC2 IP
    wait_for_health(public_ip)

    # Step 5: Deploy Frontend with CloudFront HTTPS URL
    amplify_url = deploy_frontend(f"{cloudfront_domain}/api")

    # Step 6: Smoke Test
    log("Running smoke test on live deployment...")
    subprocess.run([sys.executable, "verify_deployment.py"], cwd=os.getcwd())

    print("\n" + "="*70)
    print(">> HACKPILOT IS LIVE!")
    print("="*70)
    print(f"  Frontend (AWS Amplify): {amplify_url}")
    print(f"  Backend API (FastAPI):  {cloudfront_domain}/api")
    print(f"  API Docs (Swagger UI):  http://{public_ip}:8000/docs")
    print(f"  Health Check:           {cloudfront_domain}/api/health")
    print("="*70)

if __name__ == "__main__":
    main()
