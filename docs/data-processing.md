# Data Processing, Profiling & Smart Cleaning Engine

## 1. Automated Profiling Algorithm

For every uploaded dataset version, the data engine computes:

1. **Shape & Memory:** Exact row count, column count, estimated memory usage.
2. **Column Data Type Classification:**
   - **Numeric:** Integer, Float (check for high cardinality vs discrete).
   - **Categorical:** String / Object with cardinality ratio < 0.2.
   - **DateTime:** Strings parseable by ISO 8601 / Pandas `to_datetime`.
   - **Boolean:** Binary 0/1, True/False, Yes/No values.
   - **Identifier:** High-cardinality unique integer/string (e.g. `customer_id`).
3. **Statistical Metrics:**
   - Mean, Std Dev, Min, Max, 25%, 50%, 75% percentiles.
   - Variance, Skewness, Kurtosis.
   - Mode & Modal Frequency for categoricals.

---

## 2. Transparent Data Quality Score Formula

Data Quality Score (0 - 100) is calculated deterministically:

$$\text{Quality Score} = 0.30 \times S_{\text{comp}} + 0.25 \times S_{\text{uniq}} + 0.25 \times S_{\text{valid}} + 0.20 \times S_{\text{cons}}$$

Where:
- **Completeness ($S_{\text{comp}}$):** $100 \times (1 - \frac{\text{Total Missing Cells}}{\text{Total Cells}})$
- **Uniqueness ($S_{\text{uniq}}$):** $100 \times (1 - \frac{\text{Duplicate Rows}}{\text{Total Rows}})$
- **Validity ($S_{\text{valid}}$):** $100 \times (1 - \frac{\text{Type Mismatch & Outlier Count}}{\text{Total Cells}})$
- **Consistency ($S_{\text{cons}}$):** $100 \times (1 - \frac{\text{Inconsistent Category Formatting Count}}{\text{Total Categorical Cells}})$

---

## 3. Smart Cleaning Operations & Non-Destructive Versioning

When a user applies a cleaning transformation, the engine:
1. Loads current active `DatasetVersion` (e.g., V1).
2. Performs Pandas transformation in memory:
   - Impute missing values (Mean, Median, Mode, Constant).
   - Drop duplicate rows.
   - Cast column data types (e.g. String -> DateTime or Float -> Int).
   - Trim text whitespace, standardize character case.
   - Remove outliers outside $[Q_1 - 1.5 \times \text{IQR}, Q_3 + 1.5 \times \text{IQR}]$.
3. Writes output to new file (e.g., `dataset_uuid_v2.csv`).
4. Creates new `DatasetVersion` record (V2) pointing to target version file.
5. Preserves V1 intact for version rollback.

---

## 4. Pattern Discovery Engine

- **Correlations:** Computes Pearson ($r$) and Spearman ($\rho$) matrices. Filters relationships with $|r| \ge 0.5$ and $p < 0.05$.
- **Anomalies:** Calculates Z-score ($|z| > 3.0$) and Isolation Forest contamination ($0.05$).
- **Clusters:** Runs K-Means ($K=2..6$), computes Silhouette Score to select optimal $K$.
- **Trends:** Fits linear/polynomial regression to date-indexed numeric metrics to report growth rate and direction.
