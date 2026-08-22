# System Architecture & Technical Specifications

## 1. Modular Monolith Architecture Overview

Aether Copilot AI follows a **Modular Monolith** pattern. All core services run within a single clean FastAPI process, separated into isolated domain modules with strictly defined interfaces.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              REACT 18 FRONTEND                              │
│  ┌──────────────────┐  ┌─────────────────────┐  ┌────────────────────────┐  │
│  │ Spatial Canvas   │  │ Interactive Charts  │  │ AI Copilot Panel       │  │
│  │ (@xyflow/react)  │  │ (Plotly.js)         │  │ (Zustand + Framer)     │  │
│  └──────────────────┘  └─────────────────────┘  └────────────────────────┘  │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │ HTTP / REST API (JWT)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FASTAPI BACKEND MODULES                           │
│  ┌─────────────────┐ ┌──────────────────┐ ┌──────────────────────────────┐  │
│  │ Auth & Users    │ │ Projects         │ │ Datasets & Versions          │  │
│  └─────────────────┘ └──────────────────┘ └──────────────────────────────┘  │
│  ┌─────────────────┐ ┌──────────────────┐ ┌──────────────────────────────┐  │
│  │ Data Profiling  │ │ Smart Cleaning   │ │ Analytics & Stats Engine     │  │
│  └─────────────────┘ └──────────────────┘ └──────────────────────────────┘  │
│  ┌─────────────────┐ ┌──────────────────┐ ┌──────────────────────────────┐  │
│  │ Pattern Engine  │ │ RAG Retrieval    │ │ Gemini AI Gateway            │  │
│  └─────────────────┘ └──────────────────┘ └──────────────────────────────┘  │
└──────────────┬────────────────────┬────────────────────┬────────────────────┘
               │                    │                    │
               ▼                    ▼                    ▼
   ┌──────────────────────┐ ┌───────────────┐ ┌───────────────────────────┐
   │ Supabase PostgreSQL  │ │ Cloudflare R2 │ │ Gemini API                │
   │ + pgvector           │ │ File Storage  │ │ (External Gateway)        │
   └──────────────────────┘ └───────────────┘ └───────────────────────────┘
```

---

## 2. Component Layer Responsibilities

### 2.1 Frontend Layer
- **Spatial Navigation:** Spatial canvas built with `@xyflow/react` representing dataset state progression (`Dataset -> Quality -> Cleaning -> Analytics -> Patterns -> AI Copilot -> Reports`).
- **State Management:** Local React state for UI components; Zustand stores for workspace canvas state, dataset cache, active node selections, and copilot context.
- **Chart Rendering:** Plotly.js (`react-plotly.js`) client-side interactive rendering using backend-supplied numerical aggregations.

### 2.2 Backend Service Layer
- **Data Engine (Pandas/SciPy/Scikit-learn):** In-memory processing of uploaded files, profile extraction, version creation, quality calculation, and statistical aggregation.
- **Pattern Engine:** Execution of correlation, IQR outlier scoring, Isolation Forest, K-Means clustering, and time-series decomposition.
- **RAG Engine:** Embedding generation (using lightweight sentence-transformers / OpenAI compatible or Gemini embeddings) and pgvector vector similarity retrieval.
- **AI Gateway:** Construction of safe structured evidence prompts sent to Gemini 1.5 Flash.

---

## 3. Data Processing Flow

1. **Ingestion:** User uploads file -> FastAPI verifies extension & magic bytes -> File saved to Storage (R2 or Local) -> Dataset record created.
2. **Profiling:** Pandas loads file -> Calculates row/col stats, missing values, types -> Stores DataProfile record.
3. **Cleaning:** User submits cleaning operations -> Backend executes transformations on DataFrame -> Saves new DatasetVersion file & database record.
4. **Analytics:** User requests query/aggregation -> Backend computes stats via Pandas/NumPy -> Returns JSON numerical results.
5. **Copilot Q&A:** User asks question -> Intent classified -> Analytics computed -> Structured evidence generated -> Vector context retrieved via pgvector -> Gemini synthesizes answer -> Returned to frontend.
