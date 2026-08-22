# Database Design & Schema Specifications

## 1. Relational Entity ERD (Supabase PostgreSQL + pgvector)

```
Users (1) ───< Projects (N) ───< Datasets (N) ───< DatasetVersions (N)
                                                         │
               ┌───────────────────┬─────────────────────┼─────────────────────┐
               ▼                   ▼                     ▼                     ▼
         DataProfiles        QualityScores       CleaningOperations      Visualizations
               │                   │                     │                     │
               └───────────────────┴─────────────────────┼─────────────────────┘
                                                         ▼
                                                   PatternResults
                                                         │
                                                         ▼
                                                      Insights
                                                         │
                                                         ▼
                                              Conversations & Messages
                                                         │
                                                         ▼
                                                      Reports
```

---

## 2. Table Definitions

### 2.1 `users`
- `id`: UUID (PK, default uuid_generate_v4())
- `email`: VARCHAR(255) (UNIQUE, NOT NULL, INDEX)
- `hashed_password`: VARCHAR(255) (NOT NULL)
- `full_name`: VARCHAR(255)
- `role`: VARCHAR(50) (default 'user')
- `created_at`: TIMESTAMPTZ (default NOW())
- `updated_at`: TIMESTAMPTZ (default NOW())

### 2.2 `projects`
- `id`: UUID (PK)
- `user_id`: UUID (FK -> users.id, ON DELETE CASCADE, INDEX)
- `name`: VARCHAR(255) (NOT NULL)
- `description`: TEXT
- `is_archived`: BOOLEAN (default FALSE)
- `created_at`: TIMESTAMPTZ
- `updated_at`: TIMESTAMPTZ

### 2.3 `datasets`
- `id`: UUID (PK)
- `project_id`: UUID (FK -> projects.id, ON DELETE CASCADE, INDEX)
- `user_id`: UUID (FK -> users.id, ON DELETE CASCADE, INDEX)
- `original_filename`: VARCHAR(255) (NOT NULL)
- `storage_path`: VARCHAR(512) (NOT NULL)
- `file_type`: VARCHAR(50) (csv, xlsx, etc.)
- `file_size_bytes`: BIGINT (NOT NULL)
- `current_version_num`: INT (default 1)
- `created_at`: TIMESTAMPTZ
- `updated_at`: TIMESTAMPTZ

### 2.4 `dataset_versions`
- `id`: UUID (PK)
- `dataset_id`: UUID (FK -> datasets.id, ON DELETE CASCADE, INDEX)
- `version_number`: INT (NOT NULL)
- `storage_path`: VARCHAR(512) (NOT NULL)
- `row_count`: INT (NOT NULL)
- `column_count`: INT (NOT NULL)
- `columns_meta`: JSONB (Column names, inferred types, missing counts)
- `created_at`: TIMESTAMPTZ

### 2.5 `data_profiles`
- `id`: UUID (PK)
- `dataset_version_id`: UUID (FK -> dataset_versions.id, ON DELETE CASCADE, INDEX)
- `numeric_summary`: JSONB (mean, std, min, max, percentiles)
- `categorical_summary`: JSONB (unique values, top categories, frequency)
- `datetime_summary`: JSONB (min date, max date, granularity)
- `data_types`: JSONB
- `created_at`: TIMESTAMPTZ

### 2.6 `quality_scores`
- `id`: UUID (PK)
- `dataset_version_id`: UUID (FK -> dataset_versions.id, ON DELETE CASCADE, INDEX)
- `overall_score`: FLOAT (NOT NULL)
- `completeness_score`: FLOAT (NOT NULL)
- `uniqueness_score`: FLOAT (NOT NULL)
- `validity_score`: FLOAT (NOT NULL)
- `consistency_score`: FLOAT (NOT NULL)
- `detected_issues`: JSONB (List of specific problems & severity)
- `created_at`: TIMESTAMPTZ

### 2.7 `cleaning_operations`
- `id`: UUID (PK)
- `dataset_id`: UUID (FK -> datasets.id, ON DELETE CASCADE)
- `source_version_id`: UUID (FK -> dataset_versions.id)
- `target_version_id`: UUID (FK -> dataset_versions.id)
- `operation_type`: VARCHAR(100) (fill_missing, drop_duplicates, cast_type, filter_outliers)
- `parameters`: JSONB
- `affected_rows_count`: INT
- `created_at`: TIMESTAMPTZ

### 2.8 `pattern_results`
- `id`: UUID (PK)
- `dataset_version_id`: UUID (FK -> dataset_versions.id, ON DELETE CASCADE, INDEX)
- `pattern_type`: VARCHAR(100) (correlation, anomaly, cluster, trend)
- `variables`: JSONB
- `statistical_metrics`: JSONB (correlation score, p-value, silhouette score)
- `evidence`: JSONB
- `explanation`: TEXT
- `created_at`: TIMESTAMPTZ

### 2.9 `insights`
- `id`: UUID (PK)
- `dataset_version_id`: UUID (FK -> dataset_versions.id, ON DELETE CASCADE, INDEX)
- `title`: VARCHAR(255)
- `insight_type`: VARCHAR(100)
- `description`: TEXT
- `computed_evidence`: JSONB
- `ai_interpretation`: TEXT
- `confidence_score`: FLOAT
- `created_at`: TIMESTAMPTZ

### 2.10 `embeddings` (pgvector Table)
- `id`: UUID (PK)
- `user_id`: UUID (FK -> users.id, ON DELETE CASCADE, INDEX)
- `project_id`: UUID (FK -> projects.id, ON DELETE CASCADE, INDEX)
- `dataset_version_id`: UUID (FK -> dataset_versions.id, ON DELETE CASCADE)
- `entity_type`: VARCHAR(50) (insight, pattern, report_section, conversation)
- `entity_id`: UUID
- `content_chunk`: TEXT (NOT NULL)
- `embedding`: VECTOR(384) (or 1536 depending on model, with HNSW / IVFFlat index)
- `created_at`: TIMESTAMPTZ

---

## 3. Database Indexes & Constraints
- Composite Index on `(user_id, project_id)` across `datasets` for fast project isolation.
- Index on `(dataset_id, version_number)` for rapid version lookup.
- HNSW Index on `embeddings.embedding` using cosine distance (`vector_cosine_ops`).
