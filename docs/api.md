# REST API Architecture & Endpoints (`/api/v1/`)

## 1. Global API Principles
- **Base URL:** `/api/v1`
- **Authentication:** Bearer JWT Header (`Authorization: Bearer <token>`).
- **Response Format:** Standardized JSON wrapper (`{ success: bool, data: T | null, error: { code: str, message: str } | null }`).

---

## 2. Endpoint Categories & Routes

### 2.1 Auth & Users (`/api/v1/auth`)
- `POST /auth/register`: Register new user account.
- `POST /auth/login`: Authenticate credentials, return access token & refresh token.
- `POST /auth/refresh`: Issue new access token using refresh token.
- `GET /auth/me`: Get current authenticated user profile.

### 2.2 Projects (`/api/v1/projects`)
- `GET /projects`: List user projects with pagination and search.
- `POST /projects`: Create new project.
- `GET /projects/{id}`: Get project details.
- `PATCH /projects/{id}`: Rename or update description.
- `DELETE /projects/{id}`: Soft delete or archive project.

### 2.3 Datasets & Versions (`/api/v1/datasets`)
- `POST /datasets/upload`: Multipart upload CSV/XLSX file. Validate file type, MIME, size, magic bytes.
- `GET /datasets`: List datasets for active project.
- `GET /datasets/{id}`: Retrieve dataset metadata and available version history.
- `GET /datasets/{id}/versions/{version_num}/preview`: Paginated preview of rows (page, page_size, search, filter, sort).
- `DELETE /datasets/{id}`: Remove dataset and associated version files.

### 2.4 Profiling & Quality (`/api/v1/profiling`)
- `GET /datasets/{id}/versions/{version_num}/profile`: Return data types, row/column counts, missing summary, statistics.
- `GET /datasets/{id}/versions/{version_num}/quality`: Return 0-100 quality score breakdown (Completeness, Uniqueness, Validity, Consistency) and detected issues.

### 2.5 Smart Cleaning (`/api/v1/cleaning`)
- `POST /datasets/{id}/clean/preview`: Preview cleaning operation result on sample rows without persisting.
- `POST /datasets/{id}/clean/apply`: Execute cleaning operations, produce new `DatasetVersion` (e.g. V2), and record operation audit.
- `POST /datasets/{id}/versions/{version_num}/rollback`: Rollback active version pointer to previous version.

### 2.6 Analytics & Aggregation (`/api/v1/analytics`)
- `POST /datasets/{id}/versions/{version_num}/query`: Compute aggregations (group_by, agg_func, columns, filter_conditions).
- `GET /datasets/{id}/versions/{version_num}/statistics`: Compute numerical percentiles, skewness, kurtosis, correlation matrix.

### 2.7 Visualizations (`/api/v1/visualizations`)
- `POST /datasets/{id}/versions/{version_num}/recommend`: Get automated chart recommendations.
- `POST /datasets/{id}/versions/{version_num}/render`: Return Plotly-formatted JSON specs for selected chart parameters.

### 2.8 Pattern Discovery (`/api/v1/patterns`)
- `POST /datasets/{id}/versions/{version_num}/discover`: Trigger pattern discovery pipeline (correlations, anomalies, clusters, trends).
- `GET /datasets/{id}/versions/{version_num}/patterns`: Retrieve list of identified pattern results with evidence.

### 2.9 AI Copilot (`/api/v1/copilot`)
- `POST /copilot/query`: Natural language question input -> Backend intent classification -> Computation engine execution -> Gemini explanation -> Response payload.
- `GET /copilot/conversations/{dataset_id}`: Fetch chat history for dataset.

### 2.10 Reports & Export (`/api/v1/reports`)
- `POST /datasets/{id}/versions/{version_num}/reports/generate`: Generate complete PDF report.
- `GET /datasets/{id}/versions/{version_num}/export`: Export cleaned dataset as sanitized CSV or Excel.
