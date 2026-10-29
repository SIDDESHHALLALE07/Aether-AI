import pandas as pd
import numpy as np
from typing import Dict, Any, List
from app.data_processing.quality import calculate_quality_score
from app.pattern_discovery.detector import detect_correlations, detect_anomalies

def generate_automated_insights(df: pd.DataFrame) -> List[Dict[str, Any]]:
    if df is None or len(df) == 0:
        return []

    insights = []

    # 1. Quality & Completeness Insight
    overall, comp, uniq, val, cons, issues = calculate_quality_score(df)
    if comp < 100.0:
        null_count = issues.get("null_cells_count", 0)
        insights.append({
            "title": f"Data Missingness Impact Alert ({comp}% Completeness)",
            "insight_type": "anomaly_alert",
            "description": f"The dataset contains {null_count} missing values across rows, reducing overall completeness to {comp}%.",
            "computed_evidence": {
                "completeness_score": comp,
                "null_cells_count": null_count,
                "overall_quality_score": overall
            },
            "ai_interpretation": "Imputing missing values using median or mode strategy before model training will prevent biased sampling and downstream data pipeline failures.",
            "confidence_score": 0.95
        })

    # 2. Correlation Insights
    corr_patterns = detect_correlations(df, threshold=0.6)
    for corr in corr_patterns[:2]:
        v1 = corr["variables"]["var1"]
        v2 = corr["variables"]["var2"]
        r_val = corr["statistical_metrics"]["pearson_r"]
        direction = corr["statistical_metrics"]["direction"]
        
        insights.append({
            "title": f"Strong {direction.capitalize()} Relationship: {v1} & {v2}",
            "insight_type": "performance_driver" if r_val > 0 else "risk_factor",
            "description": f"Statistical correlation analysis revealed a strong {direction} relationship between {v1} and {v2} (Pearson r = {r_val}).",
            "computed_evidence": {
                "variable_1": v1,
                "variable_2": v2,
                "pearson_r": r_val,
                "p_value": corr["statistical_metrics"]["p_value"]
            },
            "ai_interpretation": f"Leverage {v1} as a key predictive feature when modeling {v2}. Changes in {v1} directly impact target outcomes.",
            "confidence_score": 0.92
        })

    # 3. Anomaly Outlier Insights
    anom_patterns = detect_anomalies(df)
    for anom in anom_patterns[:2]:
        col = anom["variables"]["target_column"]
        out_cnt = anom["statistical_metrics"]["outlier_count"]
        out_pct = anom["statistical_metrics"]["outlier_percentage"]
        
        insights.append({
            "title": f"Outlier Concentration in {col} ({out_cnt} Anomalies)",
            "insight_type": "risk_factor",
            "description": f"{col} has {out_cnt} statistical outliers ({out_pct}% of records) outside IQR threshold bounds.",
            "computed_evidence": {
                "target_column": col,
                "outlier_count": out_cnt,
                "outlier_percentage": out_pct,
                "upper_bound": anom["statistical_metrics"]["upper_bound"]
            },
            "ai_interpretation": f"Investigate if extreme values in {col} represent measurement errors or high-value customer segments. Consider clipping IQR bounds.",
            "confidence_score": 0.88
        })

    # 4. Fallback Default Insight for valid non-empty datasets
    if not insights and len(df) > 0:
        insights.append({
            "title": "Healthy Distribution & Metric Balance",
            "insight_type": "opportunity",
            "description": f"Dataset contains {len(df):,} records with stable quality metrics.",
            "computed_evidence": {"total_rows": len(df), "total_columns": len(df.columns)},
            "ai_interpretation": "The dataset is structured and ready for deeper exploratory analysis.",
            "confidence_score": 0.90
        })

    return insights
