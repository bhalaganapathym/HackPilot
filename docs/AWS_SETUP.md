# HackPilot — AWS Setup Guide

> **Single Source of Truth** for all AWS configuration steps.
> Complete every step in order. Do not skip steps.
> Commands assume Windows PowerShell unless noted.

---

## Environment Inventory (Pre-Checked)

| Tool | Status | Version |
| :--- | :---: | :--- |
| AWS CLI | ❌ NOT INSTALLED | To be installed in Step 2 |
| Python | ✅ Installed | 3.12.1 (`D:\python\python.exe`) |
| boto3 | ✅ Installed in venv | 1.43.98 |
| numpy | ✅ Installed in venv | 2.5.3 |
| scikit-learn | ✅ Installed in venv | 1.9.1 |
| pypdf | ✅ Installed in venv | 6.19.0 |
| Node.js | ✅ Installed | v24.12.0 |
| Git | ✅ Installed | 2.51.0 |
| Docker | ❌ NOT INSTALLED | Not required for initial App Runner zip/repo deploy |

---

## STEP 0 — AWS Account Check

**Why:** Verify account type, credit balance, and region before spending any money.

### Action Required — AWS Console
1. Open [https://console.aws.amazon.com/billing/home#/credits](https://console.aws.amazon.com/billing/home#/credits)
2. Note your **current credit balance** (expected: ~$100 promotional credits).
3. Open [https://console.aws.amazon.com/billing/home#/account](https://console.aws.amazon.com/billing/home#/account)
4. Note your **account plan** (Free Tier or Paid).
5. Check [https://console.aws.amazon.com/billing/home#/freetier](https://console.aws.amazon.com/billing/home#/freetier) for current Free Tier usage.

---

## STEP 1 — Region Selection

**Chosen Region: `us-east-1` (US East - N. Virginia)**

**Why this region:**
- Full Amazon Bedrock support (Claude 3.5 Sonnet, Titan Embeddings V2).
- AWS App Runner available.
- AWS Amplify Hosting available.
- Amazon DynamoDB available with high throughput.
- Amazon S3 available with lowest latency & cost.
- All required Bedrock models verified available in `us-east-1`.

**Rule:** All resources must be created in `us-east-1`.

---

## STEP 2 — Install AWS CLI

**Why:** Required for CLI-based authentication, resource creation, and verification.

### Windows Installation
Download and run the official 64-bit installer:
[https://awscli.amazonaws.com/AWSCLIV2.msi](https://awscli.amazonaws.com/AWSCLIV2.msi)

Or run in PowerShell (as Administrator):
```powershell
msiexec.exe /i https://awscli.amazonaws.com/AWSCLIV2.msi /quiet
```

**Verify:**
```powershell
aws --version
```
Expected output: `aws-cli/2.x.x Python/3.x.x Windows/...`

---

## STEP 3 — AWS CLI Authentication

**Why:** The application uses the AWS SDK credential chain.

### Recommended Method: IAM User or SSO Browser Login

If using AWS IAM Identity Center (SSO):
```powershell
aws configure sso --profile hackpilot
```

If using standard IAM user credentials:
```powershell
aws configure --profile hackpilot
```
- **AWS Access Key ID:** `[From your AWS IAM user]`
- **AWS Secret Access Key:** `[From your AWS IAM user - NEVER paste in chat]`
- **Default region name:** `us-east-1`
- **Default output format:** `json`

> ⚠️ **SECURITY:** Never commit credentials to Git. Never paste credentials into chat or prompts.

---

## STEP 4 — Verify Identity

```powershell
aws sts get-caller-identity --profile hackpilot
```
Expected output:
```json
{
    "UserId": "AIDAXXXXXXXXXXXXXXXXX",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/hackpilot-dev"
}
```

---

## STEP 5 — Enable Bedrock Model Access

**Why:** Amazon Bedrock requires explicit opt-in for foundation models.

### Action Required — AWS Console
1. Open [https://us-east-1.console.aws.amazon.com/bedrock/home?region=us-east-1#/modelaccess](https://us-east-1.console.aws.amazon.com/bedrock/home?region=us-east-1#/modelaccess)
2. Click **"Modify model access"** (or **"Manage model access"**).
3. Check:
   - ✅ **Anthropic / Claude 3.5 Sonnet** (`anthropic.claude-3-5-sonnet-20241022-v2:0`)
   - ✅ **Amazon / Titan Text Embeddings V2** (`amazon.titan-embed-text-v2:0`)
4. Click **"Next"** and **"Submit"**.
5. Wait until status shows **"Access granted"**.

---

## STEP 6 — Test Bedrock (Claude 3.5 Sonnet)

```powershell
aws bedrock-runtime invoke-model `
  --region us-east-1 `
  --profile hackpilot `
  --model-id "anthropic.claude-3-5-sonnet-20241022-v2:0" `
  --body '{"anthropic_version":"bedrock-2023-05-31","max_tokens":50,"messages":[{"role":"user","content":"Say: AWS Bedrock working"}]}' `
  --content-type "application/json" `
  --accept "application/json" `
  bedrock-test.json

Get-Content bedrock-test.json
Remove-Item bedrock-test.json
```

---

## STEP 7 — Test Titan Embeddings V2

```powershell
aws bedrock-runtime invoke-model `
  --region us-east-1 `
  --profile hackpilot `
  --model-id "amazon.titan-embed-text-v2:0" `
  --body '{"inputText":"HackPilot test embedding","dimensions":512,"normalize":true}' `
  --content-type "application/json" `
  --accept "application/json" `
  titan-test.json

(Get-Content titan-test.json | ConvertFrom-Json).embedding.Count
Remove-Item titan-test.json
```
Expected output: `512`

---

## STEP 8 — Create S3 Bucket

```powershell
aws s3api create-bucket `
  --bucket hackpilot-dev-artifacts `
  --region us-east-1 `
  --profile hackpilot

aws s3api put-public-access-block `
  --bucket hackpilot-dev-artifacts `
  --region us-east-1 `
  --profile hackpilot `
  --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

---

## STEP 9 — Create DynamoDB Table

```powershell
aws dynamodb create-table `
  --table-name hackpilot-dev-submissions `
  --attribute-definitions AttributeName=pk,AttributeType=S AttributeName=sk,AttributeType=S `
  --key-schema AttributeName=pk,KeyType=HASH AttributeName=sk,KeyType=RANGE `
  --billing-mode PAY_PER_REQUEST `
  --region us-east-1 `
  --profile hackpilot
```

---

## STEP 10 — Create App Runner IAM Role

Trust Policy (`trust-policy.json`):
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "tasks.apprunner.amazonaws.com"},
    "Action": "sts:AssumeRole"
  }]
}
```

Permissions Policy (`app-runner-policy.json`):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "BedrockInvoke",
      "Effect": "Allow",
      "Action": ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
      "Resource": [
        "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0",
        "arn:aws:bedrock:us-east-1::foundation-model/amazon.titan-embed-text-v2:0"
      ]
    },
    {
      "Sid": "S3Artifacts",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::hackpilot-dev-artifacts",
        "arn:aws:s3:::hackpilot-dev-artifacts/*"
      ]
    },
    {
      "Sid": "DynamoDB",
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem", "dynamodb:GetItem", "dynamodb:UpdateItem",
        "dynamodb:DeleteItem", "dynamodb:Query", "dynamodb:Scan"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:*:table/hackpilot-dev-submissions"
    },
    {
      "Sid": "CloudWatchLogs",
      "Effect": "Allow",
      "Action": ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
      "Resource": "arn:aws:logs:us-east-1:*:log-group:/hackpilot/*"
    }
  ]
}
```

---

## STEP 11 — Cost Monitoring & Budget Alert

### Action Required — AWS Console
1. Open [https://console.aws.amazon.com/billing/home#/budgets/create](https://console.aws.amazon.com/billing/home#/budgets/create)
2. Budget Type: **Cost budget**
3. Name: `hackpilot-mvp-budget`
4. Amount: **$90**
5. Alerts at:
   - 10% ($9)
   - 25% ($22.50)
   - 50% ($45)
   - 75% ($67.50)
   - 90% ($81)
6. Add your email address for instant alert notifications.

---

## Cost Safety Bounds Summary

| Service | Setting / Bound | Cost Protection Mechanism |
| :--- | :--- | :--- |
| Bedrock Claude | `BEDROCK_MAX_TOKENS=2000` | Hard cap on generation length |
| Bedrock Titan | 512 dimensions | Normalized compact vector |
| S3 | Max 10MB per deck | Direct rejection of oversized files |
| DynamoDB | PAY_PER_REQUEST (On-Demand) | Zero idle cost; free tier includes 25GB |
| App Runner | 0.25 vCPU, 0.5GB RAM | Smallest size; auto-pauses when idle |
