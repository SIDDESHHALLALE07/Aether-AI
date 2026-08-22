# Product Requirements Document (PRD)

## 1. Product Identification
- **Name:** Aether Copilot AI
- **Tagline:** From Raw Data to Intelligent Insights
- **Target Audience:** Students, Researchers, Data Analytics Learners, Data Analysts, Educators, Small Businesses, Non-Technical Users.

---

## 2. Core Functional Requirements

### 2.1 Dataset Management & Ingestion
- Support upload for `.csv`, `.tsv`, `.xlsx`, and `.xls` files (max 100MB per file free tier limit).
- Non-destructive dataset versioning (`Original -> V1 -> V2`).
- Dataset preview with server-side pagination, search, column sorting, and filtering.

### 2.2 Data Profiling & Quality Scoring
- Calculate exact row/column counts, missing values per column, duplicate row counts, unique value cardinalities, and infer data types (Numeric, Categorical, DateTime, Boolean, Identifier).
- Transparent 0-100 Data Quality Score calculated from Completeness (30%), Uniqueness (25%), Validity (25%), and Consistency (20%).

### 2.3 Smart Data Cleaning
- Recommendations and automated execution for:
  - Missing value imputation (Mean, Median, Mode, Drop, Custom Constant).
  - Duplicate row removal.
  - Type casting & normalization.
  - Outlier filtering (IQR & Z-score thresholds).
  - String normalization (trim whitespace, lowercasing, regex cleanup).
- Visual before/after comparisons and version rollback.

### 2.4 Statistical Analytics & Visualizations
- Descriptive analytics (Mean, Std Dev, Variance, Skewness, Kurtosis, Min/Max, Percentiles 25/50/75).
- Aggregations (Group by, Sum, Count, Average, Min, Max).
- Interactive Plotly.js charts (Bar, Line, Pie, Donut, Histogram, Scatter, Box plot, Correlation Heatmap, Area).
- Automated chart type recommendations based on selected variable data types.

### 2.5 Hidden Pattern Discovery Engine
- Pearson & Spearman correlation matrix calculation.
- Anomaly detection using Z-Score, IQR, Isolation Forest, and DBSCAN.
- Clustering analysis using K-Means with elbow method evaluation.
- Time-series trend analysis and seasonality detection.

### 2.6 AI Copilot & Semantic Retrieval (RAG)
- Natural language querying interface ("What is wrong with my dataset?", "What are the strongest correlations?", "Find hidden patterns").
- **Strict Separation Rule:** Python analytics engine performs all mathematical calculations; Gemini API synthesizes natural language explanations based only on structured backend evidence.
- Vector retrieval via `pgvector` for context-aware Q&A without sending raw rows to Gemini.

### 2.7 Reports & Exporting
- Automated generation of executive summary reports.
- Multi-format exports: PDF (formatted report), cleaned CSV, and Excel (`.xlsx`).
- Formula injection protection on all export streams (`=`, `@`, `+`, `-`).

---

## 3. Non-Functional Requirements
- **Performance:** Response time under 200ms for metadata preview, under 1.5s for statistical profiling of 100k rows.
- **Security:** JWT authentication, bcrypt password hashing, workspace isolation, rate limiting (100 req/min), CORS protection.
- **Accessibility:** WCAG 2.1 AA compliance, full keyboard accessibility, dark/light theme support, `prefers-reduced-motion` compliance.
