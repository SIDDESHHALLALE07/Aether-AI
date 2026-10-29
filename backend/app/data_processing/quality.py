import pandas as pd
import numpy as np
from typing import Dict, Any, Tuple

def calculate_quality_score(df: pd.DataFrame) -> Tuple[float, float, float, float, float, Dict[str, Any]]:
    total_cells = df.shape[0] * df.shape[1] if df.shape[0] > 0 and df.shape[1] > 0 else 1
    total_rows = df.shape[0] if df.shape[0] > 0 else 1
    
    # 1. Completeness Score (30% Weight)
    null_cells = int(df.isnull().sum().sum())
    completeness_score = max(0.0, min(100.0, round((1.0 - (null_cells / total_cells)) * 100, 2)))
    
    # 2. Uniqueness Score (25% Weight)
    duplicate_rows = int(df.duplicated().sum())
    uniqueness_score = max(0.0, min(100.0, round((1.0 - (duplicate_rows / total_rows)) * 100, 2)))
    
    # 3. Validity Score (25% Weight)
    # Check for empty string representation or unparseable formats
    invalid_cells = 0
    for col in df.columns:
        s = df[col].astype(str).str.strip()
        invalid_cells += (s == "").sum() + (s.str.lower() == "nan").sum() + (s.str.lower() == "null").sum() + (s.str.lower() == "n/a").sum()
    validity_score = max(0.0, min(100.0, round((1.0 - (invalid_cells / total_cells)) * 100, 2)))
    
    # 4. Consistency Score (20% Weight) - Outliers via IQR
    outlier_cells = 0
    numeric_cols = df.select_dtypes(include="number").columns
    for col in numeric_cols:
        clean_s = df[col].dropna()
        if len(clean_s) > 4:
            q25, q75 = clean_s.quantile([0.25, 0.75])
            iqr = q75 - q25
            if iqr > 0:
                lower = q25 - 1.5 * iqr
                upper = q75 + 1.5 * iqr
                outlier_cells += int(((clean_s < lower) | (clean_s > upper)).sum())
                
    consistency_score = max(0.0, min(100.0, round((1.0 - (outlier_cells / total_cells)) * 100, 2)))
    
    # 5. Overall Score (Weighted Average)
    overall_score = round(
        (0.30 * completeness_score) +
        (0.25 * uniqueness_score) +
        (0.25 * validity_score) +
        (0.20 * consistency_score),
        2
    )

    detected_issues = {
        "null_cells_count": null_cells,
        "duplicate_rows_count": duplicate_rows,
        "invalid_cells_count": invalid_cells,
        "outlier_cells_count": outlier_cells,
        "total_cells": total_cells,
        "total_rows": total_rows,
        "issues_summary": []
    }

    if null_cells > 0:
        detected_issues["issues_summary"].append(f"Found {null_cells} missing values across dataset.")
    if duplicate_rows > 0:
        detected_issues["issues_summary"].append(f"Found {duplicate_rows} duplicate rows.")
    if outlier_cells > 0:
        detected_issues["issues_summary"].append(f"Detected {outlier_cells} statistical outliers.")

    return overall_score, completeness_score, uniqueness_score, validity_score, consistency_score, detected_issues
