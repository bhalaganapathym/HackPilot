# HackPilot · Two-Sided Hackathon Co-Pilot

> **The AI Co-Pilot for Builders and Organizers**  
> *"Calm Core, Vivid Moments"* — Built with Apple Human Interface Principles for the AWS Hackathon Jury.

HackPilot turns hackathon friction into an engaging, gamified experience while giving organizers and judges deep automated intelligence:
1. **For Participants:** Instant pitch refinement with 5-metric scoring and weakness quests, truthful challenge statement decoding, a 7-domain Red Team stress-testing arena, and real-time rehearsal against 3 distinct AI Judge archetypes.
2. **For Organizers:** Automated submission ingestion, semantic clustering via Amazon Titan Text Embeddings V2 & K-Means, Differentiation Dossiers, and evidence-backed Judge Dossiers with custom questions.

---

## 🌐 Live Production Endpoints

| Component | Provider | Live URL |
| :--- | :--- | :--- |
| **Frontend Web App** | AWS Amplify Hosting | **[https://main.d1mlf5y8eyh58y.amplifyapp.com](https://main.d1mlf5y8eyh58y.amplifyapp.com)** |
| **Backend HTTPS API** | Amazon CloudFront CDN | **[https://dw5virp5mxy8d.cloudfront.net/api](https://dw5virp5mxy8d.cloudfront.net/api)** |
| **Interactive API Docs**| FastAPI Swagger UI | **[http://13.220.200.19:8000/docs](http://13.220.200.19:8000/docs)** |
| **API Health Check** | FastAPI Service | **[https://dw5virp5mxy8d.cloudfront.net/api/health](https://dw5virp5mxy8d.cloudfront.net/api/health)** |

---

## 🏗️ Architecture Diagram

```
[ User Browser / Judge ]
       │
       ├───────────────────────────────────────────┐
       │ HTTPS (Amplify Edge)                      │ HTTPS (CloudFront Edge)
       ▼                                           ▼
┌───────────────────────────────┐   ┌───────────────────────────────┐
│     AWS Amplify Hosting       │   │     Amazon CloudFront CDN     │
│  Next.js 14 Production App    │   │  SSL Termination & API Proxy  │
└───────────────────────────────┘   └───────────────┬───────────────┘
                                                    │ HTTP (Port 8000)
                                                    ▼
                                    ┌───────────────────────────────┐
                                    │    FastAPI Application Host   │
                                    │   Amazon Linux 2023 (EC2)     │
                                    │   IAM Role: Instance Profile  │
                                    └───────┬───────────────┬───────┘
                                            │               │
                  ┌─────────────────────────┴────┐          │
                  │ Boto3 SDK (IMDSv2 Auth)      │          │
                  ▼                              ▼          ▼
   ┌─────────────────────────────┐   ┌─────────────────────────────┐
   │       Amazon Bedrock        │   │       Amazon DynamoDB       │
   │ ├── Nova Pro v1.0 (JSON)    │   │  (hackpilot-dev-submissions)│
   │ └── Titan Embeddings V2     │   │  Dual Persistence Cloud Sync│
   └─────────────────────────────┘   └─────────────────────────────┘
                  │                                 │
                  ▼                                 ▼
   ┌─────────────────────────────┐   ┌─────────────────────────────┐
   │          Amazon S3          │   │      SQLite Local Cache     │
   │  Artifact & Model Storage   │   │  Zero-latency query cache   │
   └─────────────────────────────┘   └─────────────────────────────┘
```

---

## 🚀 Quickstart: Local Setup (Under 3 Minutes)

### 1. Prerequisites
- Python 3.11+
- Node.js 18+ and `npm`

### 2. Backend Setup
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
# Copy local environment template
copy .env.example .env
# Launch FastAPI dev server
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open **`http://localhost:3000`** in your browser.

---

## 🔑 Environment Variables

### Backend (`backend/.env`)
| Variable | Default | Description |
| :--- | :--- | :--- |
| `PROJECT_NAME` | `HackPilot` | Application name displayed in Swagger docs |
| `API_V1_STR` | `/api` | Base API prefix |
| `DATABASE_URL` | `sqlite:///./hackpilot.db` | Local SQLite database URI |
| `CORS_ORIGINS` | `["*"]` | Allowed CORS origins (JSON string or list) |
| `AI_PROVIDER` | `bedrock` | `bedrock` (Production AWS) or `mock` (Deterministic unit test mode) |
| `BEDROCK_MODEL_ID` | `amazon.nova-pro-v1:0` | Amazon Bedrock LLM Foundation Model ID |
| `TITAN_MODEL_ID` | `amazon.titan-embed-text-v2:0` | Amazon Titan Embeddings model ID |
| `BEDROCK_MAX_TOKENS` | `2000` | Max token budget per inference call |
| `BEDROCK_TIMEOUT_SECONDS` | `60` | Network socket timeout for Bedrock Converse |
| `AWS_REGION` | `us-east-1` | AWS deployment region |
| `AWS_PROFILE` | `hackpilot` | Local AWS CLI profile name (leave empty in cloud deployment) |
| `S3_BUCKET_NAME` | `hackpilot-dev-artifacts-...` | Durable object storage bucket |
| `DYNAMODB_TABLE_NAME`| `hackpilot-dev-submissions` | Dual persistence DynamoDB table |

### Frontend (`frontend/.env.local`)
| Variable | Value | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `https://dw5virp5mxy8d.cloudfront.net/api` | Live production HTTPS backend API endpoint |

---

## 🛠️ Development & Testing Commands

### Run Full Pytest Suite (45 Tests)
```bash
cd backend
pytest tests/ -v
```

### Run Phase 38 End-to-End Acceptance Tests (Live Cloud)
```bash
cd backend
python e2e_acceptance_test.py
```

### Run Fast Deployment Smoke Test
```bash
cd backend
python verify_deployment.py
```

### Build Frontend Static Export
```bash
cd frontend
npm run build
```

---

## 📦 Deployment Commands

### Backend Deployment (Automated)
```bash
cd backend
python deploy_live.py
```
Provisions the IAM instance role, Security Group, packages the source, pushes to S3, configures EC2 systemd, and checks `/api/health`.

### Frontend Deployment (Automated)
```bash
cd frontend
python deploy_amplify.py
```
Injects the live API URL, compiles Next.js static export, and deploys directly to AWS Amplify via pre-signed S3 deployment archive.

---

## 💰 Cost Safety Notes & Free Tier Compliance

HackPilot is engineered to minimize AWS costs and stay strictly within the AWS Free Tier:

1. **EC2 Instance (`t3.small` / `t3.micro`):** Free Tier provides 750 hours/month of micro instances. Cost is < \$0.02/hr.
2. **Amazon CloudFront:** Free Tier includes 1 TB of outbound data transfer per month and 10,000,000 HTTP/HTTPS requests.
3. **AWS Amplify Hosting:** Free Tier covers 1,000 build minutes/month and 15 GB of hosted bandwidth.
4. **Amazon DynamoDB:** Free Tier includes 25 GB of storage and 25 Write / 25 Read Capacity Units (On-Demand billing).
5. **Amazon S3:** Free Tier includes 5 GB of standard storage and 20,000 GET / 2,000 PUT requests.
6. **Amazon Bedrock (Nova Pro + Titan Embeddings):** Pay-per-token pricing with strict max token clamps (`BEDROCK_MAX_TOKENS=2000`) and prompt truncation guards (`MAX_ABSTRACT_LENGTH=5000`). Total estimated cost during evaluation: < \$0.50.

---

## ⚠️ Current Limitations & Roadmap

- **Model Context Clamping:** Prompts are defensively truncated at 5,000 characters to prevent prompt injection and token budget overruns.
- **Single-Table DynamoDB Schema:** Optimized for submission indexing and organizer queries; fine-grained user authentication (Cognito) is intentionally decoupled as per project architecture rules.
- **WebSocket Streaming:** Real-time AI thinking tokens utilize high-speed polling / Server-Sent Events rather than persistent WebSockets to maximize compatibility with serverless and CDN edge caching.
