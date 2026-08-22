# Security Architecture & Risk Mitigations

## 1. Authentication & Token Management
- Passwords hashed using `bcrypt` with work factor 12 (never stored plain-text).
- Access tokens (JWT) signed with HS256 algorithm using 64-character secret key, 60-minute expiration.
- Refresh tokens stored as hashed tokens in database with revocation capabilities.
- Strict server-side permission verification on every route handler ensuring `user_id` owns the requested dataset/project.

---

## 2. File Upload Security
- **Treat Uploads as Untrusted Input:** Never execute uploaded files under any circumstance.
- **Verification Pipeline:**
  1. Extension check (`.csv`, `.tsv`, `.xlsx`, `.xls`).
  2. MIME type inspection (`text/csv`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`).
  3. Magic bytes signature validation (e.g. checking PK\x03\x04 headers for XLSX).
  4. File size limits (100MB per file).
  5. Filename sanitization (removing path traversal sequences `../`, `..\\`, special chars).
- Files stored in non-public storage buckets (R2 / private local folder) with randomized UUID filenames.

---

## 3. Protection Against Attacks

### 3.1 Spreadsheet Formula Injection
- Exported CSVs and Excel files are checked for cell values beginning with formula triggers (`=`, `+`, `-`, `@`, `\t`, `\r`).
- Dangerous cells are escaped by prepending a single quote `'` (e.g., `'=CMD|' /C calc'!A1`).

### 3.2 SQL & Vector Injection
- SQLAlchemy 2.0 parameterized ORM queries used exclusively across all database operations.
- Vector queries sanitized and executed via parameterized `pgvector` operators.

### 3.3 Prompt Injection Defense
- User prompts submitted to AI Copilot are passed through input sanitization filters.
- System instructions strictly isolate system prompts from user text using XML delimiter boundaries.
- Gemini is instructed to act **strictly as a data explainer** and ignore instructions attempting to override role constraints.

### 3.4 Data Privacy & API Protection
- Gemini API key strictly resides in backend environment variables (`GEMINI_API_KEY`) and is **never** exposed to client JS bundles.
- Rate limiting implemented per user IP and user ID (100 requests per minute using slowapi/Redis/in-memory limiter).
- Strict CORS configuration limiting accepted origins to authorized frontend domains.
