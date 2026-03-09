# LeadFlow SEO

Lead acquisition, evaluation, and outreach platform for SEO services.

## Quick Start

### 1. Clone & configure
```bash
cp .env.example .env
# Edit .env with your Supabase + ReachInbox credentials
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

### 3. Backend (with Docker)
```bash
docker-compose up -d
# → http://localhost:8000/docs (Swagger UI)
```

### 3b. Backend (without Docker)
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
# In a separate terminal:
celery -A app.core.celery_app worker --loglevel=info --pool=solo
```

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React + Vite + Tailwind CSS |
| Backend | FastAPI |
| Task Queue | Celery + Redis |
| Database | Supabase (PostgreSQL) |
| Email | ReachInbox API |

## Project Structure

```
FYP-1/
├── frontend/          # React SPA
│   ├── src/
│   │   ├── components/layout/   # Sidebar, TopBar
│   │   ├── pages/               # 6 page components
│   │   ├── services/api.js      # Axios client
│   │   └── ...
│   └── ...
├── backend/           # FastAPI + Celery
│   ├── app/
│   │   ├── api/routes/          # 6 route modules
│   │   ├── core/                # Config, Celery, Security
│   │   └── tasks/               # 3 Celery tasks
│   └── ...
├── docker-compose.yml
└── .env.example
```
