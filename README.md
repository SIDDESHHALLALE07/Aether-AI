# Aether Copilot AI

> **From Raw Data to Intelligent Insights**

Aether Copilot AI is an enterprise-grade, spatial AI-powered data analytics platform that empowers users to upload CSV and Excel datasets, profile data quality, execute versioned smart data cleaning, perform statistical analytics, discover hidden patterns, and interact with a context-aware Gemini AI Copilot.

---

## 🌟 Core Product Features

- 🗺️ **Spatial Analytics Workspace:** Visual node-based workflow powered by `@xyflow/react` (React Flow) connecting Dataset → Quality → Cleaning → Analytics → Visualizations → Patterns → AI Copilot → Insights → Reports.
- 🧹 **Transparent Data Profiling & Smart Cleaning:** Automated detection of missing values, duplicates, type mismatches, text inconsistencies, and outliers with non-destructive dataset versioning (`Original -> V1 -> V2`).
- 📊 **Interactive Data Visualizations:** High-performance Plotly charts (Bar, Line, Donut, Scatter, Box Plot, Heatmap, Histogram) with automated chart recommendations.
- 🔎 **Hidden Pattern Discovery:** Dedicated engine for Pearson/Spearman correlation, Z-score/IQR anomaly detection, Isolations Forests, K-Means clustering, and trend analysis.
- 🧠 **Separation of Computation and AI Explanation:** All mathematical aggregations and statistical measures are strictly computed by Python/Pandas/SciPy on the backend. Gemini AI synthesizes clear explanations based only on structured computation evidence.
- ⚡ **RAG & Vector Retrieval:** Semantic context retrieval using Supabase PostgreSQL and `pgvector`.

---

## 🛠️ Free-First Technology Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, React Router v6, React Flow (`@xyflow/react`), Framer Motion, Lucide React, Plotly.js (`react-plotly.js`).
- **Backend:** Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy 2.0, Alembic, Uvicorn.
- **Data & Analytics:** Pandas, NumPy, SciPy, Scikit-learn.
- **Database & Storage:** Supabase PostgreSQL with `pgvector` extension, Cloudflare R2 (with local filesystem fallback).
- **AI Engine:** Google Gemini API (via backend proxy only).

---

## 🚀 Development Status & Roadmap

| Milestone | Description | Status |
| :--- | :--- | :---: |
| **Milestone 0** | Planning and Architecture Documentation | ✅ Verified |
| **Milestone 1** | Frontend Foundation (React + Vite + Tailwind) | ✅ Verified |
| **Milestone 2** | Spatial UI Interface (React Flow integration) | ✅ Verified |
| **Milestone 3** | Database Setup & Migration (SQLAlchemy + pgvector) | ✅ Verified |
| **Milestone 4** | Backend Foundation (FastAPI modular monolith) | ✅ Verified |
| **Milestone 5** | REST API Layer & Schemas | ✅ Verified |
| **Milestone 6** | Authentication & Security (JWT, bcrypt, isolation) | ✅ Verified |
| **Milestone 7** | Dataset Management & Storage | ✅ Verified |
| **Milestone 8** | Data Profiling & Quality Engine | ✅ Verified |
| **Milestone 9** | Smart Cleaning & Versioning Engine | ✅ Verified |
| **Milestone 10** | Analytics & Aggregation Engine | ✅ Verified |
| **Milestone 11** | Interactive Visualization Engine | ✅ Verified |
| **Milestone 12** | Hidden Pattern Discovery Engine | ✅ Verified |
| **Milestone 13** | Gemini AI Copilot Integration | ✅ Verified |
| **Milestone 14** | `pgvector` Semantic Retrieval (RAG) | ✅ Verified |
| **Milestone 15** | AI Insights Engine | ⏳ Pending |
| **Milestone 16** | Automated Reports & Multi-format Export | ⏳ Pending |
| **Milestone 17** | Comprehensive Security Audit | ⏳ Pending |
| **Milestone 18** | End-to-End Automated Testing | ⏳ Pending |
| **Milestone 19** | Performance Optimization & Chunking | ⏳ Pending |
| **Milestone 20** | Deployment Preparation | ⏳ Pending |

---

## 💻 Quick Start & Setup

### Prerequisites
- Node.js 18+ & npm
- Python 3.11+
- Git

### Backend Setup
```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 📁 Repository Structure

```
Aether-Copilot-AI/
├── docs/                      # Architectural & design documentation
├── frontend/                  # React + Vite + TypeScript + Tailwind CSS application
├── backend/                   # FastAPI modular monolith service
├── .env.example               # Environment variable configuration template
├── .gitignore                 # Git ignore rules
└── README.md                  # Project overview & roadmap
```

---

## 🔒 Security & Privacy

- Untrusted dataset file handling & verification (magic bytes, extensions, size limits).
- Server-side JWT validation & user workspace isolation.
- Formula injection protection on CSV/Excel export (`=`, `@`, `+`, `-` sanitization).
- No raw sensitive dataset rows transmitted to external LLM APIs.
