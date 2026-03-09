# 🚀 LeadFlow SEO: Enterprise-Ready Lead & Outreach Engine

LeadFlow is a full-stack platform designed to automate the entire B2B outreach funnel—from discovery to campaign delivery. Specifically optimized for SEO agencies, it uses AI to audit local businesses and craft high-converting personalized emails.

---

## 💎 Core Features

- **Lead Discovery Engine**: Scalable lead acquisition with integrated search filtering (Niche, City, Country).
- **SEO Audit Evaluation**: Scored auditing process to identify high-potential prospects (Leads with poor SEO score = High Priority).
- **AI Email Generation**: Sequential generation using **Gemini 2.0 Flash** to draft custom outreach based on specific audit "reasoning".
- **ReachInbox CRM Integration**: 
    - Full campaign management (Start/Pause directly from UI).
    - Automated lead pushing with `{{custom_subject}}` and `{{custom_body}}` variable injection.
    - Live CRM stats (Sent, Opened, Replied, Bounced) synced in real-time.
- **Dynamic Dashboard**: Live KPI tracking for your entire outreach ecosystem.

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------|
| **Frontend** | React (Vite) + Tailwind CSS + Lucide Icons |
| **Backend** | FastAPI (Python 3.11+) |
| **Database** | Supabase (Postgres) |
| **AI SDK** | Google `genai` (Gemini 2.0 Flash) |
| **HTTP client** | `httpx` (Asynchronous CRM Sync) |
| **Auth** | JWT-based Secure Authentication |

---

## ⚡ Quick Start

### 1. Environment Configuration
Copy the template and fill in your keys:
```bash
cp .env.example .env
```
*Required: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `GEMINI_API_KEY`, `REACHINBOX_API_KEY`.*

### 2. Frontend Development
```bash
cd frontend
npm install
npm run dev
# Dashboard at http://localhost:5173
```

### 3. Backend Development
We recommend using a virtual environment:
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Or Windows: .venv\Scripts\activate
pip install -r requirements.txt
python run.py
# API Docs at http://localhost:8000/docs
```

---

## 🔄 The User Workflow

1.  **Lead Acquisition**: Search or filter leads and click **"Move to Audit"**.
2.  **Lead Evaluation**: Run the scoring algorithm. High priority leads (needs help) are highlighted. Click **"Proceed to Email Generation"**.
3.  **Email Generation**: Hit **"Generate Emails"**. Emails are drafted sequentially with real-time feedback.
4.  **Email Sending**: Click **"Proceed to Sending"**, name your ReachInbox campaign, and high-tail it to the sending page to start the outreach.
5.  **Analytics**: Monitor the **Dashboard** for open rates and reply performance.

---

## 📂 Project Structure

```bash
FYP-1/
├── frontend/             # SPA Core
│   ├── src/pages/        # [Dashboard, LeadAcquisition, LeadEvaluation, EmailGeneration, EmailSending]
│   ├── src/services/api/ # Axios-based Service Layer
│   └── ...
├── backend/              # API Core
│   ├── app/api/routes/   # [dashboard, emails, leads, sending]
│   ├── app/core/config/  # Settings & Environment Parser
│   └── run.py            # Uvicorn entry point
├── Dockerfile            # Container deployment (Production)
└── .env.example          # Security template
```
