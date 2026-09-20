# HackPilot — AWS Architecture Specification

> Single source of truth for HackPilot cloud architecture, service boundaries, data flows, and security policies.

---

## 1. System Overview & Core Principle

HackPilot is a **two-sided hackathon co-pilot platform** that reduces participant friction and eliminates organizer fatigue:
1. **Participant Engine:** Understand challenge requirements, refine abstracts with rubric scoring, defend architectures in a 7-domain Red Team Arena, and rehearse against realistic AI Judge archetypes.
2. **Organizer Intelligence:** Ingests submissions, clusters ideas using Amazon Titan Text Embeddings V2 and K-Means, generates Differentiation Dossiers, and prepares evidence-backed 5-criterion Judge Dossiers with custom questions.

---

## 2. Component Topology Diagram

```
                                  [ User Web Browser ]
                                           │
                        ┌──────────────────┴──────────────────┐
                        │ HTTPS (TLS 1.3)                     │ HTTPS (TLS 1.3)
                        ▼                                     ▼
        ┌───────────────────────────────┐     ┌───────────────────────────────┐
        │       AWS Amplify Hosting     │     │      Amazon CloudFront CDN    │
        │ https://main.<app>.amplifyapp │     │ https://dw5virp5mxy8d.cloudfr │
        │ (Next.js 14 Static Export)    │     └───────────────┬───────────────┘
        └───────────────────────────────┘                     │ HTTP Reverse Proxy (port 8000)
                                                              ▼
                                              ┌───────────────────────────────┐
                                              │    FastAPI Application Server │
                                              │  (Amazon Linux 2023 EC2 Host) │
                                              │  Public IP: 13.220.200.19:800 │
                                              │  Systemd: hackpilot.service   │
                                              └───────┬───────────────┬───────┘
                                                      │               │
                            ┌─────────────────────────┴────┐          │
                            │ IAM Instance Profile         │          │
                            │ (hackpilot-ec2-profile)      │          │
                            ▼                              ▼          ▼
             ┌─────────────────────────────┐   ┌─────────────────────────────┐
             │       Amazon Bedrock        │   │       Amazon DynamoDB       │
             │ ├── Nova Pro v1.0           │   │  (hackpilot-dev-submissions)│
             │ └── Titan Embeddings V2     │   │  PK: SUBMISSION             │
             └─────────────────────────────┘   │  SK: SUB#{id}               │
                            │                  └─────────────────────────────┘
                            ▼                                 │
             ┌─────────────────────────────┐                  ▼
             │          Amazon S3          │   ┌─────────────────────────────┐
             │ (hackpilot-dev-artifacts-   │   │       SQLite Cache DB       │
             │  318273660064)              │   │   (Dual-Persistence Sync)   │
             └─────────────────────────────┘   └─────────────────────────────┘
```

---

## 3. Detailed Service Breakdown

### A. Frontend: AWS Amplify Hosting
- **URL:** `https://main.d1mlf5y8eyh58y.amplifyapp.com`
- **Framework:** Next.js 14 (App Router)
- **Deployment Mode:** Static HTML/JS export (`output: 'export'`) with `trailingSlash: true`.
- **API Connectivity:** Configured via `NEXT_PUBLIC_API_URL=https://dw5virp5mxy8d.cloudfront.net/api`.
- **Global CDN:** Global CloudFront edge network caching static assets, delivering sub-50ms latency.

### B. HTTPS Ingress & CDN: Amazon CloudFront
- **Distribution ID:** `E2CBM76392OJVI`
- **Domain:** `https://dw5virp5mxy8d.cloudfront.net`
- **Origin:** EC2 Backend Origin (`http://ec2-13-220-200-19.compute-1.amazonaws.com:8000`)
- **Protocol Policy:** `redirect-to-https` (Viewer), `http-only` (Origin)
- **Allowed Methods:** `GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE`
- **Purpose:** Eliminates browser Mixed Content Blocking by providing a managed TLS certificate for the API backend.

### C. Backend API: FastAPI Server
- **Host:** Dedicated AWS EC2 Instance (`i-0333b455f5fa842f3`, `t3.small`) in `us-east-1`.
- **Operating System:** Amazon Linux 2023 (`ami-0b2c9d1f3edcfd709`).
- **Process Manager:** Systemd service (`hackpilot.service`) with auto-restart on failure.
- **Port:** 8000.
- **Security Group:** `hackpilot-sg` (`sg-054e51779e7130eeb`) allowing inbound ports 22, 80, 443, 3000, and 8000.
- **IAM Authentication:** Attached IAM Instance Profile (`hackpilot-ec2-profile`) using AWS STS metadata credentials (IMDSv2) — zero credentials stored on disk.

### D. AI & Intelligence: Amazon Bedrock
- **Text & Reasoning Model:** `amazon.nova-pro-v1:0`
  - Strict JSON schema enforcement via prompt engineering and runtime Pydantic validation.
  - Generates Problem Breakdowns, Red Team Attacks, Defense Ratings, Judge Simulator Dialogue, and Judge Dossiers.
- **Embeddings Model:** `amazon.titan-embed-text-v2:0`
  - Generates 512-dimensional normalized vectors for submission abstracts.
  - Used for cohort similarity indexing, duplicate detection, and K-Means domain clustering.

### E. Data Layer: Dual-Persistence Architecture
- **Primary Durable Cloud Store: Amazon DynamoDB**
  - Table: `hackpilot-dev-submissions`
  - Partition Key (`pk`): `SUBMISSION`
  - Sort Key (`sk`): `SUB#{submission_id}`
  - Pay-Per-Request on-demand billing.
- **Local Ephemeral Store: SQLite**
  - Path: `/opt/hackpilot/hackpilot.db`
  - Zero-latency relational reads for cluster queries and UI state.
- **Object Store: Amazon S3**
  - Bucket: `hackpilot-dev-artifacts-318273660064`
  - Block Public Access: Fully enabled.
  - Stores deployment packages, PDF pitch decks, and cluster export manifests.

---

## 4. Security & Compliance Posture

1. **Least-Privilege IAM:** The backend server assumes `hackpilot-ec2-role` with policies restricted to `bedrock:InvokeModel`, `dynamodb:PutItem/GetItem/Query`, and `s3:PutObject/GetObject`.
2. **Zero Credentials in Code:** No AWS Access Keys or Secrets are committed to Git, embedded in Dockerfiles, or stored on disk.
3. **CORS Configuration:** Backend explicitly handles CORS headers for the Amplify domain and local development origins.
4. **Input Length Limits:**
   - Abstract: 5,000 chars max
   - Problem Statement: 8,000 chars max
   - Concept / Idea: 3,000 chars max
   - Defense: 2,000 chars max
   - Question: 500 chars max
