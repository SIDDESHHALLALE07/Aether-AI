import pandas as pd
import numpy as np
from typing import Dict, Any, List

def detect_correlations(df: pd.DataFrame, threshold: float = 0.5) -> List[Dict[str, Any]]:
    numeric_df = df.select_dtypes(include="number").dropna()
    if numeric_df.shape[1] < 2 or numeric_df.shape[0] < 3:
        return []

    from scipy import stats

    patterns = []
    cols = list(numeric_df.columns)
    
    for i in range(len(cols)):
        for j in range(i + 1, len(cols)):
            c1, c2 = cols[i], cols[j]
            r, p_val = stats.pearsonr(numeric_df[c1], numeric_df[c2])
            
            if abs(r) >= threshold:
                direction = "positive" if r > 0 else "negative"
                strength = "strong" if abs(r) >= 0.7 else "moderate"
                explanation = (
                    f"A {strength} {direction} correlation was discovered between '{c1}' and '{c2}' "
                    f"(Pearson r = {round(float(r), 3)}, p-value = {float(p_val):.2e}). "
                    f"As '{c1}' increases, '{c2}' tends to {'increase' if r > 0 else 'decrease'}."
                )
                patterns.append({
                    "pattern_type": "correlation",
                    "variables": {"var1": c1, "var2": c2},
                    "statistical_metrics": {
                        "pearson_r": round(float(r), 4),
                        "p_value": float(p_val),
                        "strength": strength,
                        "direction": direction
                    },
                    "evidence": {
                        "sample_size": len(numeric_df),
                        "mean_var1": round(numeric_df[c1].mean(), 2),
                        "mean_var2": round(numeric_df[c2].mean(), 2)
                    },
                    "explanation": explanation
                })
                
    return patterns

def detect_anomalies(df: pd.DataFrame) -> List[Dict[str, Any]]:
    numeric_df = df.select_dtypes(include="number")
    if numeric_df.shape[1] < 1 or numeric_df.shape[0] < 4:
        return []

    patterns = []
    for col in numeric_df.columns:
        s = numeric_df[col].dropna()
        if len(s) < 4:
            continue
            
        q25, q75 = s.quantile([0.25, 0.75])
        iqr = q75 - q25
        if iqr == 0:
            continue
            
        lower_bound = q25 - 1.5 * iqr
        upper_bound = q75 + 1.5 * iqr
        outliers = s[(s < lower_bound) | (s > upper_bound)]
        
        if len(outliers) > 0:
            outlier_pct = round(len(outliers) / len(s) * 100, 2)
            explanation = (
                f"Detected {len(outliers)} statistical anomaly outlier(s) in '{col}' ({outlier_pct}% of total records). "
                f"Values fell outside IQR bounds [{round(float(lower_bound), 2)}, {round(float(upper_bound), 2)}]."
            )
            patterns.append({
                "pattern_type": "anomaly",
                "variables": {"target_column": col},
                "statistical_metrics": {
                    "outlier_count": len(outliers),
                    "outlier_percentage": outlier_pct,
                    "lower_bound": round(float(lower_bound), 2),
                    "upper_bound": round(float(upper_bound), 2),
                    "max_outlier": round(float(outliers.max()), 2),
                    "min_outlier": round(float(outliers.min()), 2)
                },
                "evidence": {
                    "sample_outlier_indices": [int(i) for i in outliers.head(5).index.tolist()],
                    "sample_outlier_values": [round(float(v), 2) for v in outliers.head(5).values.tolist()]
                },
                "explanation": explanation
            })
            
    return patterns

def detect_clusters(df: pd.DataFrame, max_k: int = 3) -> List[Dict[str, Any]]:
    numeric_df = df.select_dtypes(include="number").dropna()
    if numeric_df.shape[1] < 2 or numeric_df.shape[0] < 6:
        return []

    try:
        from sklearn.preprocessing import StandardScaler
        from sklearn.cluster import KMeans
        scaler = StandardScaler()
        scaled_data = scaler.fit_transform(numeric_df)
        
        k = min(max_k, len(numeric_df) // 2)
        if k < 2:
            return []

        kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = kmeans.fit_predict(scaled_data)
        
        centers = scaler.inverse_transform(kmeans.cluster_centers_)
        cluster_summary = []
        
        for c_idx in range(k):
            size = int((labels == c_idx).sum())
            pct = round(size / len(numeric_df) * 100, 2)
            c_center = {cols: round(float(val), 2) for cols, val in zip(numeric_df.columns, centers[c_idx])}
            cluster_summary.append({
                "cluster_id": c_idx + 1,
                "record_count": size,
                "percentage": pct,
                "centroid_means": c_center
            })

        cols_str = ", ".join(list(numeric_df.columns)[:3])
        explanation = (
            f"Automated segmentation identified {k} distinct clusters across dimensions ({cols_str}). "
            f"Inertia = {round(kmeans.inertia_, 2)}."
        )

        return [{
            "pattern_type": "segmentation_cluster",
            "variables": {"feature_columns": list(numeric_df.columns), "num_clusters": k},
            "statistical_metrics": {
                "num_clusters": k,
                "inertia": round(kmeans.inertia_, 2)
            },
            "evidence": {
                "clusters": cluster_summary
            },
            "explanation": explanation
        }]
    except Exception as e:
        return []
