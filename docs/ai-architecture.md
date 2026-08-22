# AI Architecture & Gemini Copilot Integration

## 1. Core Principle: Separation of Computation & AI Explanation

```
User Query
    │
    ▼
FastAPI Copilot Gateway
    │
    ├── 1. Classify Intent (Pandas Stat, Profiling, Pattern, Chart, General Q&A)
    ├── 2. Execute Analytics Engine (Python/Pandas/SciPy) -> Calculate Exact Values
    ├── 3. Retrieve Relevant Context (pgvector similarity search)
    │
    ▼
Structured Evidence Context (JSON)
    │
    ▼
Gemini 1.5 Flash API Gateway (Backend Only)
    │
    ▼
Natural Language Explanation (Markdown + Action Cards)
    │
    ▼
React Frontend Copilot Interface
```

---

## 2. Evidence Payload Contract

Gemini is provided with **zero raw dataset rows**. It receives a structured evidence block formatted as JSON:

```json
{
  "user_question": "What are the strongest correlations in my dataset?",
  "dataset_metadata": {
    "filename": "customer_churn.csv",
    "total_rows": 10500,
    "total_columns": 12,
    "version": 2
  },
  "computed_evidence": {
    "matrix_type": "Pearson Correlation",
    "top_correlations": [
      { "var1": "MonthlyCharges", "var2": "TotalCharges", "coefficient": 0.826, "p_value": 0.0001 },
      { "var1": "Tenure", "var2": "TotalCharges", "coefficient": 0.812, "p_value": 0.0001 },
      { "var1": "Tenure", "var2": "ContractLength", "coefficient": 0.645, "p_value": 0.0002 }
    ]
  },
  "retrieved_context_chunks": [
    "Dataset profile indicates zero missing values in MonthlyCharges and TotalCharges."
  ]
}
```

---

## 3. System Prompt Design

```text
You are Aether Copilot, an expert data analytics AI assistant.
Your responsibility is to explain data analytics findings to users clearly and concisely.

CRITICAL CONSTRAINTS:
1. You MUST NOT invent, guess, or hallucinate numerical values. Use ONLY the exact numerical values provided in the COMPUTED EVIDENCE section.
2. If the user asks a question requiring calculation not present in the evidence, state clearly that the calculation needs to be executed by the engine first.
3. Keep your explanation structured, professional, and accessible to non-technical users.
4. Always clearly distinguish between COMPUTED EVIDENCE (facts) and AI INTERPRETATION (insights/recommendations).
```

---

## 4. Vector Search & RAG Architecture (pgvector)
- Embeddings generated for dataset profiles, pattern summaries, insights, and report sections using 384-dimensional sentence-transformer / Google embedding models.
- Stored in `embeddings` table in Supabase PostgreSQL.
- Queries perform HNSW vector similarity search scoped to `(user_id, project_id)` to prevent cross-user context leaks.
