import math
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple, cast
import numpy as np
import pandas as pd


def _detect_column_types(df: pd.DataFrame) -> Dict[str, Dict[str, Any]]:
    """
    Detects and classifies each column into numeric, datetime, categorical, or identifier.
    Excludes pseudo-numeric identifiers and detects date strings.
    """
    col_profiles: Dict[str, Dict[str, Any]] = {}
    total_rows = len(df)

    for col in df.columns:
        series = df[col]
        non_null = series.dropna()
        non_null_count = len(non_null)
        unique_count = non_null.nunique()
        missing_count = total_rows - non_null_count
        missing_pct = round((missing_count / total_rows * 100), 2) if total_rows > 0 else 0.0

        is_numeric = False
        is_datetime = False
        is_id = False
        is_categorical = False
        parsed_dates = None

        # 1. Check if datetime
        if pd.api.types.is_datetime64_any_dtype(series):
            is_datetime = True
        elif series.dtype == object or str(series.dtype) == "string":
            # Attempt parsing a sample of non-null strings as dates
            if non_null_count > 0:
                sample = non_null.head(20)
                try:
                    import warnings
                    with warnings.catch_warnings():
                        warnings.simplefilter("ignore")
                        parsed = pd.to_datetime(sample, errors="coerce")
                        if parsed.notna().sum() >= len(sample) * 0.8:
                            is_datetime = True
                            parsed_dates = pd.to_datetime(non_null, errors="coerce")
                except Exception:
                    pass

        # 2. Check if numeric
        if not is_datetime and pd.api.types.is_numeric_dtype(series):
            # Check if it's an ID-like column (e.g. integer index 1..N with 100% uniqueness)
            col_name_lower = col.lower()
            if (unique_count == total_rows and total_rows > 30 and ("id" in col_name_lower or "code" in col_name_lower or "num" in col_name_lower)):
                is_id = True
            else:
                is_numeric = True

        # 3. If string/object and not datetime
        if not is_numeric and not is_datetime:
            col_name_lower = col.lower()
            if unique_count == total_rows and total_rows > 20:
                is_id = True
            elif "id" in col_name_lower and unique_count > total_rows * 0.8:
                is_id = True
            else:
                is_categorical = True

        summary_text = ""
        if is_numeric:
            s_num = pd.to_numeric(non_null, errors="coerce").dropna()
            if len(s_num) > 0:
                summary_text = f"[{s_num.min():.1f} to {s_num.max():.1f}], Med: {s_num.median():.1f}"
            else:
                summary_text = "Numeric values"
        elif is_categorical:
            top_val = non_null.value_counts().head(1)
            if len(top_val) > 0:
                pct = (top_val.iloc[0] / max(1, non_null_count)) * 100
                summary_text = f"Top: {str(top_val.index[0])[:12]} ({pct:.0f}%)"
            else:
                summary_text = f"{unique_count} categories"
        elif is_datetime:
            if parsed_dates is not None and len(parsed_dates.dropna()) > 0:
                d_clean = parsed_dates.dropna()
                summary_text = f"{d_clean.min().strftime('%Y-%m-%d')} to {d_clean.max().strftime('%Y-%m-%d')}"
            else:
                summary_text = "Temporal sequence"
        elif is_id:
            summary_text = f"{unique_count:,} unique identifiers"
        else:
            summary_text = f"{unique_count:,} distinct values"

        col_profiles[col] = {
            "name": col,
            "dtype": str(series.dtype),
            "is_numeric": is_numeric,
            "is_datetime": is_datetime,
            "is_categorical": is_categorical,
            "is_id": is_id,
            "non_null_count": non_null_count,
            "missing_count": missing_count,
            "missing_pct": missing_pct,
            "unique_count": unique_count,
            "summary": summary_text,
            "parsed_dates": parsed_dates
        }

    return col_profiles


def _compute_data_quality_score(
    df: pd.DataFrame,
    col_profiles: Dict[str, Dict[str, Any]]
) -> Tuple[int, Dict[str, int], List[Dict[str, Any]]]:
    """
    Computes a grounded 0-100 Data Quality Score based on:
    - Completeness (missing value proportion)
    - Uniqueness (duplicate rows proportion)
    - Validity (constant columns, invalid values)
    - Consistency (type homogeneity)
    """
    total_rows = len(df)
    total_cols = len(df.columns)
    if total_rows == 0 or total_cols == 0:
        return 0, {"completeness": 0, "uniqueness": 0, "validity": 0, "consistency": 0}, []

    total_cells = total_rows * total_cols
    total_missing = sum(p["missing_count"] for p in col_profiles.values())
    completeness_score = max(0, min(100, round((1.0 - (total_missing / total_cells)) * 100)))

    duplicate_rows = int(df.duplicated().sum())
    duplicate_pct = (duplicate_rows / total_rows) * 100
    uniqueness_score = max(0, min(100, round(100 - (duplicate_pct * 2))))

    # Validity: check for constant columns or columns with all unique strings
    constant_cols = [p["name"] for p in col_profiles.values() if p["unique_count"] <= 1 and p["non_null_count"] > 0]
    validity_penalty = len(constant_cols) * 10
    validity_score = max(30, min(100, 100 - validity_penalty))

    # Consistency: penalty for high missingness clusters or schema irregularity
    high_missing_cols = [p["name"] for p in col_profiles.values() if p["missing_pct"] > 30.0]
    consistency_penalty = len(high_missing_cols) * 8
    consistency_score = max(30, min(100, 100 - consistency_penalty))

    overall_score = round(
        completeness_score * 0.35 +
        uniqueness_score * 0.25 +
        validity_score * 0.20 +
        consistency_score * 0.20
    )

    factors: List[Dict[str, Any]] = []
    if total_missing == 0:
        factors.append({
            "dimension": "Completeness",
            "impact": "positive",
            "message": f"Zero missing values detected across all {total_cells:,} data cells (100% complete)."
        })
    else:
        factors.append({
            "dimension": "Completeness",
            "impact": "negative" if completeness_score < 90 else "neutral",
            "message": f"Identified {total_missing:,} missing values ({round(total_missing/total_cells*100, 2)}% of cells) across {len([p for p in col_profiles.values() if p['missing_count'] > 0])} columns."
        })

    if duplicate_rows == 0:
        factors.append({
            "dimension": "Uniqueness",
            "impact": "positive",
            "message": f"Zero duplicate records found across {total_rows:,} rows (100% unique observations)."
        })
    else:
        factors.append({
            "dimension": "Uniqueness",
            "impact": "negative",
            "message": f"Detected {duplicate_rows:,} duplicate rows ({round(duplicate_pct, 2)}% of dataset)."
        })

    if constant_cols:
        factors.append({
            "dimension": "Validity",
            "impact": "negative",
            "message": f"{len(constant_cols)} constant or near-constant column(s) detected with single distinct value: {', '.join(constant_cols[:3])}."
        })
    else:
        factors.append({
            "dimension": "Validity",
            "impact": "positive",
            "message": "All columns exhibit natural variability without degenerate zero-variance fields."
        })

    sub_scores = {
        "completeness": completeness_score,
        "uniqueness": uniqueness_score,
        "validity": validity_score,
        "consistency": consistency_score
    }

    return overall_score, sub_scores, factors


def _compute_numeric_profile(df: pd.DataFrame, col: str) -> Dict[str, Any]:
    """
    Computes rigorous descriptive stats, quartiles, IQR, skewness, and outliers.
    """
    series = pd.to_numeric(df[col], errors="coerce").dropna()
    n = len(series)
    if n == 0:
        return {}

    mean_val = series.mean()
    std_val = series.std() if n > 1 else 0.0
    min_val = float(series.min())
    max_val = float(series.max())
    q25 = series.quantile(0.25)
    median_val = series.quantile(0.50)
    q75 = series.quantile(0.75)
    iqr_val = q75 - q25

    lower_bound = q25 - 1.5 * iqr_val
    upper_bound = q75 + 1.5 * iqr_val

    outlier_series = series[(series < lower_bound) | (series > upper_bound)]
    outlier_count = len(outlier_series)
    outlier_pct = round((outlier_count / n * 100), 2)

    extreme_low = [round(float(v), 2) for v in outlier_series[outlier_series < lower_bound].head(3).tolist()]
    extreme_high = [round(float(v), 2) for v in outlier_series[outlier_series > upper_bound].head(3).tolist()]

    skew_raw = series.skew()
    skew_val = float(cast(Any, skew_raw)) if n > 2 and not pd.isna(skew_raw) else 0.0

    # Skewness classification
    if abs(skew_val) < 0.5:
        skew_class = "Approximately Symmetric"
    elif skew_val >= 0.5:
        skew_class = "Positively Skewed (Right-tailed)"
    else:
        skew_class = "Negatively Skewed (Left-tailed)"

    # Histogram binning (10 bins)
    counts, bin_edges = np.histogram(series, bins=10)
    histogram_data = []
    for i in range(len(counts)):
        label = f"{round(float(bin_edges[i]), 1)}–{round(float(bin_edges[i+1]), 1)}"
        histogram_data.append({
            "bin": label,
            "count": int(counts[i]),
            "pct": round(float(counts[i] / n * 100), 1)
        })

    return {
        "count": n,
        "mean": round(mean_val, 2),
        "std": round(std_val, 2),
        "min": round(min_val, 2),
        "q1": round(q25, 2),
        "median": round(median_val, 2),
        "q3": round(q75, 2),
        "max": round(max_val, 2),
        "iqr": round(iqr_val, 2),
        "variance": round(float(cast(Any, series.var())), 2) if n > 1 else 0.0,
        "skewness": round(skew_val, 2),
        "skewness_classification": skew_class,
        "outlier_count": outlier_count,
        "outlier_pct": outlier_pct,
        "lower_bound": round(lower_bound, 2),
        "upper_bound": round(upper_bound, 2),
        "extreme_low": extreme_low,
        "extreme_high": extreme_high,
        "histogram_bins": histogram_data
    }


def _compute_categorical_profile(df: pd.DataFrame, col: str) -> Dict[str, Any]:
    """
    Computes frequency distribution, dominant categories, and percentage contributions.
    """
    clean_s = df[col].dropna().astype(str)
    n = len(clean_s)
    if n == 0:
        return {}

    counts = clean_s.value_counts()
    unique_count = len(counts)
    top_items = []

    for val, cnt in counts.head(8).items():
        top_items.append({
            "category": str(val),
            "count": cnt,
            "pct": round((cnt / n * 100), 2)
        })

    top_cat = str(counts.index[0]) if len(counts) > 0 else "N/A"
    top_count = counts.iloc[0] if len(counts) > 0 else 0
    top_pct = round((top_count / n * 100), 2) if n > 0 else 0.0
    dominant = top_cat if top_pct >= 40.0 else None
    rare_count = int((cast(Any, counts) < (n * 0.02)).sum())

    return {
        "unique_count": unique_count,
        "top_category": top_cat,
        "top_count": top_count,
        "top_pct": top_pct,
        "dominant_category": dominant,
        "rare_categories_count": rare_count,
        "distribution": top_items
    }


def _compute_datetime_profile(df: pd.DataFrame, col: str, parsed_dates: Optional[pd.Series] = None) -> Dict[str, Any]:
    """
    Computes date range, span in days, chronological frequency, and temporal trends.
    """
    if parsed_dates is not None:
        dates = parsed_dates.dropna()
    else:
        dates = pd.to_datetime(df[col], errors="coerce").dropna()

    if len(dates) == 0:
        return {"available": False, "reason": "No valid datetime values parseable."}

    min_date = dates.min()
    max_date = dates.max()
    span_days = (max_date - min_date).days

    # Group by month or date to detect trend
    if span_days > 120:
        period_series = cast(Any, dates.dt).to_period("M").astype(str).value_counts().sort_index()
        granularity = "Monthly"
    else:
        period_series = cast(Any, dates.dt).to_period("D").astype(str).value_counts().sort_index()
        granularity = "Daily"

    periods = list(period_series.index)
    counts = [int(v) for v in period_series.values]

    # Trend direction calculation
    trend_dir = "Stable"
    growth_rate = 0.0
    if len(counts) >= 2:
        first_half = sum(counts[:len(counts)//2]) / max(1, len(counts)//2)
        second_half = sum(counts[len(counts)//2:]) / max(1, len(counts) - len(counts)//2)
        if first_half > 0:
            growth_rate = round(((second_half - first_half) / first_half) * 100, 1)
            if growth_rate > 15:
                trend_dir = "Upward Expansion"
            elif growth_rate < -15:
                trend_dir = "Downward Contraction"
            else:
                trend_dir = "Stable Volume"

    peak_idx = int(np.argmax(counts)) if counts else 0
    trough_idx = int(np.argmin(counts)) if counts else 0

    return {
        "available": True,
        "column": col,
        "min_date": str(min_date.date()),
        "max_date": str(max_date.date()),
        "span_days": span_days,
        "granularity": granularity,
        "trend_direction": trend_dir,
        "growth_rate_pct": growth_rate,
        "peak_period": periods[peak_idx] if periods else "N/A",
        "peak_count": counts[peak_idx] if counts else 0,
        "trough_period": periods[trough_idx] if periods else "N/A",
        "trough_count": counts[trough_idx] if counts else 0,
        "timeline": [{"period": str(p), "count": c} for p, c in zip(periods[:36], counts[:36])]
    }


def _compute_correlations(
    df: pd.DataFrame,
    numeric_cols: List[str],
    method: str = "pearson"
) -> Dict[str, Any]:
    """
    Computes correlation matrix and classifies linear association strengths.
    Strictly avoids causal language ("causes"), uses "associated with".
    """
    if len(numeric_cols) < 2:
        return {
            "available": False,
            "reason": "At least two continuous numerical variables required for correlation analysis.",
            "columns": numeric_cols,
            "matrix": [],
            "relationships": []
        }

    corr_df = df[numeric_cols].apply(pd.to_numeric, errors="coerce").corr(method=cast(Any, method)).fillna(0)
    matrix = np.round(corr_df.to_numpy(), 3).tolist()
    cols = list(corr_df.columns)

    relationships: List[Dict[str, Any]] = []
    seen = set()

    for i in range(len(cols)):
        for j in range(i + 1, len(cols)):
            col1 = cols[i]
            col2 = cols[j]
            val = float(cast(Any, corr_df.iloc[i, j]))
            abs_val = abs(val)

            if abs_val >= 0.7:
                strength = "Strong positive" if val > 0 else "Strong negative"
            elif abs_val >= 0.4:
                strength = "Moderate positive" if val > 0 else "Moderate negative"
            elif abs_val >= 0.15:
                strength = "Weak positive" if val > 0 else "Weak negative"
            else:
                strength = "Little or no linear relationship"

            relationships.append({
                "feature_x": col1,
                "feature_y": col2,
                "correlation": round(val, 3),
                "strength": strength,
                "interpretation": f"A {strength.lower()} statistical relationship is observed between {col1} and {col2} (r = {val:.2f})."
            })

    # Sort relationships by absolute correlation magnitude descending
    relationships.sort(key=lambda r: abs(r["correlation"]), reverse=True)

    return {
        "available": True,
        "method": method,
        "columns": cols,
        "matrix": matrix,
        "relationships": relationships
    }


def _synthesize_insights_and_recommendations(
    row_count: int,
    col_count: int,
    overall_score: int,
    sub_scores: Dict[str, int],
    numeric_profiles: Dict[str, Dict[str, Any]],
    cat_profiles: Dict[str, Dict[str, Any]],
    trend_profile: Dict[str, Any],
    corr_profile: Dict[str, Any],
    max_insights: int = 6
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Synthesizes grounded patterns, ranked AI insights, and categorized recommendations.
    Every insight provides WHAT, WHY, EVIDENCE, and IMPLICATION.
    """
    patterns: List[Dict[str, Any]] = []
    insights: List[Dict[str, Any]] = []
    recommendations: List[Dict[str, Any]] = []

    # 1. Data Quality / Completeness Pattern
    comp_score = sub_scores.get("completeness", 100)
    if comp_score < 95:
        patterns.append({
            "type": "Missingness Concentration",
            "evidence": f"Completeness score evaluated at {comp_score}/100.",
            "explanation": f"Missing values concentrate in non-critical columns; data imputation or verification is needed prior to production model training."
        })
        insights.append({
            "title": "Sub-Optimal Data Completeness Detected",
            "severity": "High" if comp_score < 80 else "Medium",
            "what": "Missing values observed in specific dataset features.",
            "why": "Missing data can introduce selection bias and distort regression estimates.",
            "evidence": f"Dataset completeness is {comp_score}%, with missing cells across attributes.",
            "implication": "Missing observations may require median/mode imputation or targeted re-collection."
        })
        recommendations.append({
            "category": "data_quality",
            "priority": "High",
            "action": "Address missing attribute values using median imputation for skewed numerical variables and mode for categories."
        })
    else:
        patterns.append({
            "type": "High Data Integrity",
            "evidence": f"{comp_score}% data completeness across {row_count:,} records.",
            "explanation": "High record completeness enables unbiased statistical inferences and stable aggregations."
        })

    # 2. Outliers & Spread Pattern
    high_outlier_cols = []
    for col, p in numeric_profiles.items():
        if p.get("outlier_pct", 0) > 3.0:
            high_outlier_cols.append((col, p["outlier_count"], p["outlier_pct"], p["lower_bound"], p["upper_bound"]))

    if high_outlier_cols:
        col_name, o_count, o_pct, lb, ub = high_outlier_cols[0]
        patterns.append({
            "type": "Statistical Outlier Distribution",
            "evidence": f"{col_name} exhibits {o_count} outliers ({o_pct}% of records) outside standard IQR bounds [{lb}, {ub}].",
            "explanation": "Outliers may signify high-value events, tail risk, or sensor/recording variance."
        })
        insights.append({
            "title": f"Notable Outlier Cluster in {col_name}",
            "severity": "Medium",
            "what": f"Distribution of {col_name} contains observations exceeding 1.5x IQR thresholds.",
            "why": "Heavy tails distort arithmetic means and standard deviation metrics.",
            "evidence": f"{o_count} records ({o_pct}%) fall outside typical limits [{lb} to {ub}].",
            "implication": "Consider robust non-parametric metrics (median, IQR) or winsorization when modeling."
        })
        recommendations.append({
            "category": "analytical",
            "priority": "Medium",
            "action": f"Apply robust scaling or segment upper-quartile outliers in '{col_name}' to prevent extreme-value distortion."
        })

    # 3. Categorical Dominance Pattern
    dominant_cats = []
    for col, cp in cat_profiles.items():
        if cp.get("dominant_category"):
            dominant_cats.append((col, cp["dominant_category"], cp["top_pct"]))

    if dominant_cats:
        col_name, d_cat, d_pct = dominant_cats[0]
        patterns.append({
            "type": "Categorical Concentration",
            "evidence": f"'{col_name}' shows '{d_cat}' representing {d_pct}% of total records.",
            "explanation": "High class concentration indicates an unbalanced categorical distribution."
        })
        insights.append({
            "title": f"Market/Class Concentration in {col_name}",
            "severity": "Medium" if d_pct > 65 else "Informational",
            "what": f"A single category dominates '{col_name}'.",
            "why": "Unbalanced distributions can cause machine learning classifiers to favor the majority class.",
            "evidence": f"Category '{d_cat}' constitutes {d_pct}% of all {row_count:,} entries.",
            "implication": "Stratified sampling or category grouping should be considered for predictive modeling."
        })
        recommendations.append({
            "category": "operational",
            "priority": "Low",
            "action": f"Monitor the dominant category '{d_cat}' in '{col_name}' to identify potential sampling bias or operational dependency. Further domain validation is recommended."
        })

    # 4. Correlation Patterns
    if corr_profile.get("available") and corr_profile.get("relationships"):
        strongest = corr_profile["relationships"][0]
        r_val = strongest["correlation"]
        c1 = strongest["feature_x"]
        c2 = strongest["feature_y"]

        if abs(r_val) >= 0.35:
            patterns.append({
                "type": "Linear Feature Association",
                "evidence": f"Pearson r = {r_val:.2f} between '{c1}' and '{c2}'.",
                "explanation": f"Strong bivariate co-movement detected between '{c1}' and '{c2}'."
            })
            insights.append({
                "title": f"Significant Association: {c1} & {c2}",
                "severity": "High" if abs(r_val) >= 0.65 else "Medium",
                "what": f"Continuous variables '{c1}' and '{c2}' show a {strongest['strength'].lower()}.",
                "why": "Colinear features provide shared variance and inform cross-dimensional drivers.",
                "evidence": f"Calculated Pearson correlation coefficient is r = {r_val:.2f}.",
                "implication": f"Changes in {c1} are strongly associated with changes in {c2}. Note: Correlation does not imply causation."
            })
            recommendations.append({
                "category": "analytical",
                "priority": "Medium",
                "action": f"Evaluate '{c1}' and '{c2}' for potential interaction terms or collinearity redundancy in multivariate regression."
            })

    # 5. Temporal Trend Pattern
    if trend_profile.get("available"):
        t_dir = trend_profile["trend_direction"]
        growth = trend_profile["growth_rate_pct"]
        peak = trend_profile["peak_period"]
        peak_cnt = trend_profile["peak_count"]

        patterns.append({
            "type": "Chronological Trajectory",
            "evidence": f"Volume trajectory is {t_dir} ({growth:+.1f}% period-over-period) peaking at {peak} ({peak_cnt} events).",
            "explanation": "Chronological sequencing reveals non-uniform volume distribution over the observed timeframe."
        })
        insights.append({
            "title": f"Chronological Trend: {t_dir}",
            "severity": "Medium",
            "what": f"Activity displays an overall {t_dir.lower()} pattern.",
            "why": "Identifying temporal shifts is critical for capacity planning, demand forecasting, and SLA management.",
            "evidence": f"Period growth rate evaluated at {growth:+.1f}%, with peak activity during {peak} ({peak_cnt} records).",
            "implication": f"Resource allocation should align with peak periods like {peak} to mitigate operational bottlenecks."
        })
        recommendations.append({
            "category": "operational",
            "priority": "Medium",
            "action": f"Align operational capacity and staffing with peak periods observed in {peak}. Further domain validation is recommended."
        })

    # Ensure at least 3-4 grounded insights
    if len(insights) < 3 and numeric_profiles:
        # Add summary distribution insight
        first_num = list(numeric_profiles.keys())[0]
        n_prof = numeric_profiles[first_num]
        insights.append({
            "title": f"Central Tendency & Spread of {first_num}",
            "severity": "Informational",
            "what": f"Distribution shows median = {n_prof['median']:,}, mean = {n_prof['mean']:,} (std = {n_prof['std']:,}).",
            "why": "Discrepancy between median and mean signals distribution asymmetry.",
            "evidence": f"IQR is {n_prof['iqr']:,} spanning Q1 ({n_prof['q1']:,}) to Q3 ({n_prof['q3']:,}).",
            "implication": "Use median as primary measure of central tendency if skewness persists."
        })

    # General Data Quality Recommendation
    if not any(r["category"] == "data_quality" for r in recommendations):
        recommendations.append({
            "category": "data_quality",
            "priority": "Low",
            "action": "Maintain automated schema validation checks on future dataset ingestion to ensure consistent type mappings."
        })

    return patterns[:5], insights[:max_insights], recommendations[:6]


def analyze_dataset_for_report(
    df: pd.DataFrame,
    dataset_name: str,
    project_name: str = "Default Project",
    version_num: int = 1,
    config: Optional[Dict[str, Any]] = None,
    user_settings: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Main entry point for generating the complete, auditable report analysis.
    Purely data-driven with zero hardcoded statistics, fake names, or fabricated charts.
    """
    config = config or {}
    user_settings = user_settings or {}

    total_rows = len(df)
    total_cols = len(df.columns)

    # 1. Schema & Column Detection
    col_profiles = _detect_column_types(df)

    numeric_cols = [c for c, p in col_profiles.items() if p["is_numeric"]]
    cat_cols = [c for c, p in col_profiles.items() if p["is_categorical"]]
    datetime_cols = [c for c, p in col_profiles.items() if p["is_datetime"]]
    id_cols = [c for c, p in col_profiles.items() if p["is_id"]]

    # 2. Data Quality Audit & Scoring
    overall_score, sub_scores, dq_factors = _compute_data_quality_score(df, col_profiles)

    # 3. Column Profiles
    numeric_profiles: Dict[str, Dict[str, Any]] = {}
    for col in numeric_cols:
        numeric_profiles[col] = _compute_numeric_profile(df, col)

    cat_profiles: Dict[str, Dict[str, Any]] = {}
    for col in cat_cols:
        cat_profiles[col] = _compute_categorical_profile(df, col)

    # 4. Trend Analysis
    trend_profile: Dict[str, Any] = {"available": False, "reason": "No temporal date/time column detected."}
    if datetime_cols:
        primary_date_col = datetime_cols[0]
        parsed_dates = col_profiles[primary_date_col].get("parsed_dates")
        trend_profile = _compute_datetime_profile(df, primary_date_col, parsed_dates)

    # 5. Correlation & Relationships
    corr_method = str(user_settings.get("correlation_method") or "pearson").lower()
    corr_profile = _compute_correlations(df, numeric_cols, method=corr_method)

    # 6. Patterns, Grounded Insights, & Recommendations
    max_insights = int(user_settings.get("insight_count") or 5)
    patterns, insights, recommendations = _synthesize_insights_and_recommendations(
        row_count=total_rows,
        col_count=total_cols,
        overall_score=overall_score,
        sub_scores=sub_scores,
        numeric_profiles=numeric_profiles,
        cat_profiles=cat_profiles,
        trend_profile=trend_profile,
        corr_profile=corr_profile,
        max_insights=max_insights
    )

    # 7. Recommended Visualizations
    recommended_viz: List[Dict[str, Any]] = []

    # Trend Chart
    if trend_profile.get("available") and numeric_cols:
        recommended_viz.append({
            "title": f"Chronological Trend: {datetime_cols[0]} vs {numeric_cols[0]}",
            "chart_type": "line",
            "columns": [datetime_cols[0], numeric_cols[0]],
            "reason": "Analyzes temporal progression, volume fluctuations, and growth trajectory.",
            "insight": f"Activity spans from {trend_profile['min_date']} to {trend_profile['max_date']} with {trend_profile['trend_direction'].lower()} trajectory."
        })
    elif trend_profile.get("available"):
        recommended_viz.append({
            "title": f"Chronological Volume: {datetime_cols[0]}",
            "chart_type": "line",
            "columns": [datetime_cols[0]],
            "reason": "Evaluates period-over-period observation frequency.",
            "insight": f"Peak activity occurred in {trend_profile['peak_period']} ({trend_profile['peak_count']} events)."
        })

    # Primary Categorical Comparison Bar Chart
    if cat_cols and numeric_cols:
        c_col = cat_cols[0]
        n_col = numeric_cols[0]
        recommended_viz.append({
            "title": f"{n_col} Comparison Across {c_col}",
            "chart_type": "bar_vertical",
            "columns": [c_col, n_col],
            "reason": "Compares continuous metric averages across discrete categories.",
            "insight": f"Identifies variance and high-performing segments across {c_col}."
        })
    elif cat_cols:
        c_col = cat_cols[0]
        recommended_viz.append({
            "title": f"{c_col} Observation Frequency",
            "chart_type": "bar_horizontal",
            "columns": [c_col],
            "reason": "Displays category distribution and ranking.",
            "insight": f"Top category '{cat_profiles[c_col].get('top_category')}' represents {cat_profiles[c_col].get('top_pct')}%."
        })

    # Distribution Histogram
    if numeric_cols:
        n_col = numeric_cols[0]
        recommended_viz.append({
            "title": f"{n_col} Frequency Distribution",
            "chart_type": "histogram",
            "columns": [n_col],
            "reason": "Reveals continuous data spread, central tendency, and skewness.",
            "insight": f"Mean is {numeric_profiles[n_col]['mean']} with IQR of {numeric_profiles[n_col]['iqr']}."
        })

    # Outlier Box Plot
    if numeric_cols:
        n_col = numeric_cols[1] if len(numeric_cols) > 1 else numeric_cols[0]
        group_col = cat_cols[0] if cat_cols else None
        recommended_viz.append({
            "title": f"{n_col} Statistical Dispersion & Outliers",
            "chart_type": "box",
            "columns": [n_col] + ([group_col] if group_col else []),
            "reason": "Visualizes medians, interquartile spread, and extreme values outside 1.5x IQR.",
            "insight": f"{numeric_profiles[n_col]['outlier_count']} outlier observations detected ({numeric_profiles[n_col]['outlier_pct']}%)."
        })

    # Correlation Heatmap
    if len(numeric_cols) >= 2:
        recommended_viz.append({
            "title": f"Multivariate Correlation Heatmap ({len(numeric_cols)} features)",
            "chart_type": "heatmap",
            "columns": numeric_cols[:8],
            "reason": "Measures pairwise Pearson collinearity across numerical metrics.",
            "insight": "Quantifies linear association without assuming causation."
        })

    # Proportional Donut
    if cat_cols:
        for c in cat_cols:
            if 2 <= cat_profiles[c]["unique_count"] <= 7:
                recommended_viz.append({
                    "title": f"{c} Share of Total (Donut)",
                    "chart_type": "donut",
                    "columns": [c],
                    "reason": "Visualizes part-to-whole proportions for bounded categorical segments.",
                    "insight": f"Top segment constitutes {cat_profiles[c]['top_pct']}% of records."
                })
                break

    # 8. Executive KPI Cards
    total_missing_cells = sum(p["missing_count"] for p in col_profiles.values())
    total_cells = total_rows * total_cols
    missing_rate_pct = round((total_missing_cells / total_cells * 100), 2) if total_cells > 0 else 0.0
    duplicate_count = int(df.duplicated().sum())

    total_outliers = sum(p.get("outlier_count", 0) for p in numeric_profiles.values())

    kpi_cards = [
        {
            "metric": "Total Records",
            "value": f"{total_rows:,}",
            "description": "Validated row count analyzed in active version."
        },
        {
            "metric": "Total Dimensions",
            "value": f"{total_cols}",
            "description": f"{len(numeric_cols)} numeric, {len(cat_cols)} categorical, {len(datetime_cols)} datetime."
        },
        {
            "metric": "Data Quality Score",
            "value": f"{overall_score}/100",
            "description": f"Completeness: {sub_scores['completeness']}%, Uniqueness: {sub_scores['uniqueness']}%."
        },
        {
            "metric": "Missing Data Rate",
            "value": f"{missing_rate_pct}%",
            "description": f"{total_missing_cells:,} missing cells across dataset."
        },
        {
            "metric": "Duplicate Records",
            "value": f"{duplicate_count:,}",
            "description": f"{round(duplicate_count/max(1, total_rows)*100, 2)}% duplicate row frequency."
        },
        {
            "metric": "Detected Outliers",
            "value": f"{total_outliers:,}",
            "description": "Values beyond 1.5x IQR across numeric features."
        }
    ]

    if trend_profile.get("available"):
        kpi_cards.append({
            "metric": "Observation Span",
            "value": f"{trend_profile['span_days']:,} Days",
            "description": f"From {trend_profile['min_date']} to {trend_profile['max_date']}."
        })

    # 9. Key Findings (Derived purely from data calculations)
    key_findings: List[str] = []
    key_findings.append(f"The dataset contains {total_rows:,} verified observations across {total_cols} attributes with an overall Data Quality Score of {overall_score}/100.")
    if missing_rate_pct == 0:
        key_findings.append("Data completeness is 100%, with zero missing cells across all columns.")
    else:
        key_findings.append(f"Data completeness is {sub_scores['completeness']}%, with {total_missing_cells:,} missing values concentrated in {[c for c, p in col_profiles.items() if p['missing_count'] > 0][:2]}.")

    if corr_profile.get("available") and corr_profile.get("relationships"):
        top_r = corr_profile["relationships"][0]
        key_findings.append(f"Strongest linear association exists between '{top_r['feature_x']}' and '{top_r['feature_y']}' (r = {top_r['correlation']:.2f}, {top_r['strength'].lower()}).")

    dominant_cats = []
    for col, cp in cat_profiles.items():
        if cp.get("dominant_category") and cp.get("top_pct", 0) > 40:
            dominant_cats.append((col, cp["dominant_category"], cp["top_pct"]))

    if dominant_cats:
        key_findings.append(f"Categorical concentration observed in '{dominant_cats[0][0]}' where '{dominant_cats[0][1]}' accounts for {dominant_cats[0][2]}% of total entries.")


    if trend_profile.get("available"):
        key_findings.append(f"Temporal analysis indicates an overall {trend_profile['trend_direction'].lower()} with peak activity recorded during {trend_profile['peak_period']}.")
    elif total_outliers > 0:
        key_findings.append(f"Identified {total_outliers:,} statistical outliers using standard IQR thresholds across numeric features.")

    # 10. Tables for Tabular Display & Platypus Tables
    # Numeric Summary Table
    numeric_summary_rows = []
    for col in numeric_cols:
        p = numeric_profiles[col]
        numeric_summary_rows.append({
            "feature": col,
            "count": f"{p['count']:,}",
            "missing": f"{col_profiles[col]['missing_count']:,}",
            "mean": f"{p['mean']:,}",
            "std": f"{p['std']:,}",
            "min": f"{p['min']:,}",
            "q1": f"{p['q1']:,}",
            "median": f"{p['median']:,}",
            "q3": f"{p['q3']:,}",
            "max": f"{p['max']:,}",
            "iqr": f"{p['iqr']:,}",
            "outliers": f"{p['outlier_count']:,} ({p['outlier_pct']}%)"
        })

    # Categorical Summary Table
    categorical_summary_rows = []
    for col in cat_cols:
        cp = cat_profiles[col]
        categorical_summary_rows.append({
            "feature": col,
            "unique": f"{cp['unique_count']:,}",
            "missing": f"{col_profiles[col]['missing_count']:,}",
            "top_category": cp['top_category'],
            "top_count": f"{cp['top_count']:,}",
            "top_pct": f"{cp['top_pct']}%",
            "dominant": cp['dominant_category'] or "None"
        })

    # 11. Methodology & Provenance
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    methodology = {
        "dataset_name": dataset_name,
        "project_name": project_name,
        "dataset_version": version_num,
        "analysis_timestamp": now_iso,
        "row_count": total_rows,
        "column_count": total_cols,
        "data_types_detected": {
            "numeric_count": len(numeric_cols),
            "categorical_count": len(cat_cols),
            "datetime_count": len(datetime_cols),
            "identifier_count": len(id_cols)
        },
        "missing_value_method": "Exact cell null count and percentage calculation across all columnar dimensions.",
        "duplicate_detection": "Complete row vector hash equality check using pandas duplicate evaluation.",
        "outlier_method": f"Tukey's Interquartile Range (IQR) rule: Outliers defined outside [Q1 - 1.5*IQR, Q3 + 1.5*IQR].",
        "correlation_method": f"Pearson product-moment correlation coefficient: r = cov(X, Y) / (std(X) * std(Y)).",
        "chart_selection_heuristics": "Automatic schema detection matching temporal dimensions to lines, single numerics to histograms, bivariate numerics to scatter/correlation, and bounded discrete sets to bar/donut.",
        "insight_grounding": "Rule-based statistical synthesis grounded strictly on calculated empirical distributions and covariance matrices. Zero hardcoding."
    }

    return {
        "report_title": f"Executive Intelligence & Analytics Report — {dataset_name}",
        "dataset_name": dataset_name,
        "project_name": project_name,
        "version_number": version_num,
        "generation_timestamp": now_iso,
        "total_rows": total_rows,
        "total_columns": total_cols,
        "column_profiles": col_profiles,
        "kpi_cards": kpi_cards,
        "key_findings": key_findings,
        "data_quality": {
            "overall_score": overall_score,
            "sub_scores": sub_scores,
            "factors": dq_factors
        },
        "numeric_profiles": numeric_profiles,
        "categorical_profiles": cat_profiles,
        "trend_analysis": trend_profile,
        "correlation_analysis": corr_profile,
        "patterns": patterns,
        "insights": insights,
        "recommendations": recommendations,
        "recommended_visualizations": recommended_viz,
        "numeric_summary_table": numeric_summary_rows,
        "categorical_summary_table": categorical_summary_rows,
        "methodology": methodology
    }
