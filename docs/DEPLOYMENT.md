# HackPilot — Deployment & Operations Guide

> Complete reference for provisioning, building, and deploying HackPilot to AWS.

---

## 1. Quick Reference: Live Endpoints

| Environment | Component | Endpoint |
| :--- | :--- | :--- |
| **Production** | Frontend (Amplify) | [https://main.d1mlf5y8eyh58y.amplifyapp.com](https://main.d1mlf5y8eyh58y.amplifyapp.com) |
| **Production** | HTTPS API (CloudFront) | [https://dw5virp5mxy8d.cloudfront.net/api](https://dw5virp5mxy8d.cloudfront.net/api) |
| **Production** | Swagger API Docs | [http://13.220.200.19:8000/docs](http://13.220.200.19:8000/docs) |
| **Production** | Health Check | [https://dw5virp5mxy8d.cloudfront.net/api/health](https://dw5virp5mxy8d.cloudfront.net/api/health) |

---

## 2. Prerequisites

- Python 3.11 or 3.12 with `boto3` installed
- Node.js 18+ and `npm`
- AWS Account with active root or IAM user in `us-east-1`
- Credentials configured in `~/.aws/credentials` under profile `hackpilot`

---

## 3. Deployment Procedure (Step-by-Step)

### Step A: Deploy Backend Server to AWS
```bash
cd backend
python deploy_live.py
```
**What this does automatically:**
1. Validates local repository and builds a clean source bundle (`hackpilot-backend-src.zip`).
2. Uploads bundle to Amazon S3 (`s3://hackpilot-dev-artifacts-318273660064/deployments/`).
3. Provisions IAM Role (`hackpilot-ec2-role`) with Amazon Bedrock, DynamoDB, and S3 permissions.
4. Provisions Security Group (`hackpilot-sg`) in the default VPC opening ports 80, 443, 8000, 3000, and 22.
5. Launches an Amazon Linux 2023 EC2 instance (`t3.small`) with automated `UserData` cloud-init.
6. Installs Python 3.11, sets up virtualenv, installs dependencies, and configures a systemd service (`hackpilot.service`).
7. Polls `/api/health` until HTTP 200 OK is returned.
8. Saves the instance endpoint to `backend/lambda_url.txt`.

### Step B: Setup CloudFront HTTPS Proxy
If not already created:
```bash
python -c "
import boto3, time
s = boto3.Session(profile_name='hackpilot', region_name='us-east-1')
cf = s.client('cloudfront')
# Configures reverse proxy behavior forwarding to EC2 port 8000
"
```
*(Live CloudFront Distribution ID: `E2CBM76392OJVI`, Domain: `https://dw5virp5mxy8d.cloudfront.net`)*

### Step C: Deploy Frontend to AWS Amplify
```bash
cd frontend
python deploy_amplify.py
```
**What this does automatically:**
1. Reads the live HTTPS backend URL from `backend/lambda_url.txt`.
2. Injects `NEXT_PUBLIC_API_URL=https://dw5virp5mxy8d.cloudfront.net/api`.
3. Runs `npm run build` using Next.js static export (`out/`).
4. Creates the AWS Amplify app (`hackpilot-frontend`) with SPA fallback rules.
5. Generates pre-signed S3 deployment upload URL and pushes `out/` bundle.
6. Triggers deployment job and monitors status until `SUCCEED`.
7. Saves Amplify live URL to `frontend/amplify_url.txt`.

---

## 4. Operational Monitoring & Health Verification

### Running Smoke Tests
Verify all live endpoints simultaneously:
```bash
cd backend
python verify_deployment.py
```

### Running Full End-to-End Acceptance Tests
Run the 4 complete hackathon workflows (Participant, Practice, Organizer, Deployment):
```bash
cd backend
python e2e_acceptance_test.py
```

### Server Logs & Troubleshooting
SSH into the backend EC2 server:
```bash
ssh ec2-user@13.220.200.19
# View live application logs
sudo journalctl -u hackpilot -f
# Restart service if needed
sudo systemctl restart hackpilot
# Check user-data cloud-init log
cat /var/log/user-data.log
```
