# Free-Tier Deployment & Infrastructure Guide

## 1. Free-First Target Stack Overview

| Component | Provider / Tool | Free Tier Allowance |
| :--- | :--- | :--- |
| **Frontend Host** | Vercel | Unlimited static & SSR preview deployments |
| **Backend Host** | Render / Railway / Fly.io | Free web service tier (512MB RAM, shared CPU) |
| **Database & Vector** | Supabase | 500MB PostgreSQL DB + `pgvector` extension |
| **File Storage** | Cloudflare R2 | 10GB storage / 10M read ops / 1M write ops per month |
| **AI LLM Engine** | Google Gemini API | Free Tier (Gemini 1.5 Flash - 15 RPM / 1M TPM) |

---

## 2. Frontend Deployment (Vercel)
1. Push codebase to GitHub/GitLab repository.
2. Import project into Vercel Dashboard.
3. Configure build settings:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Add Environment Variable:
   - `VITE_API_BASE_URL=https://your-backend-api.onrender.com/api/v1`

---

## 3. Backend Deployment (Render / Railway / Fly.io)
1. Create new Web Service linked to repository.
2. Environment: `Python 3.11`
3. Build Command: `pip install -r backend/requirements.txt`
4. Start Command: `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
5. Configure Environment Variables:
   - `DATABASE_URL=postgresql://postgres:password@db.supabase.co:5432/postgres`
   - `SECRET_KEY=secure-random-key`
   - `GEMINI_API_KEY=your-gemini-key`
   - `STORAGE_DRIVER=r2` (or `local` for basic testing)
   - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`

---

## 4. Supabase PostgreSQL & pgvector Setup
1. Create a free project at [supabase.com](https://supabase.com).
2. Open SQL Editor and execute extension setup:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;
```
3. Run Alembic migrations from backend to initialize tables:
```bash
alembic upgrade head
```
