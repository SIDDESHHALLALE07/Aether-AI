import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional
from fastapi import HTTPException, status

def compute_summary_statistics(df: pd.DataFrame) -> Dict[str, Any]:
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    stats = {}
    
    for col in numeric_cols:
        clean_s = df[col].dropna()
        if len(clean_s) > 0:
            q25, q50, q75 = clean_s.quantile([0.25, 0.50, 0.75]).tolist()
            stats[str(col)] = {
                "count": int(len(clean_s)),
                "mean": float(round(clean_s.mean(), 4)),
                "std": float(round(clean_s.std(), 4)) if len(clean_s) > 1 else 0.0,
                "min": float(clean_s.min()),
                "q25": float(round(q25, 4)),
                "median": float(round(q50, 4)),
                "q75": float(round(q75, 4)),
                "max": float(clean_s.max()),
                "variance": float(round(clean_s.var(), 4)) if len(clean_s) > 1 else 0.0,
                "skewness": float(round(clean_s.skew(), 4)) if len(clean_s) > 2 else 0.0
            }
            
    return stats

def compute_group_by_aggregation(
    df: pd.DataFrame,
    group_by_column: str,
    target_column: str,
    aggregation_func: str = "mean"
) -> List[Dict[str, Any]]:
    if group_by_column not in df.columns:
        raise HTTPException(status_code=400, detail=f"Group-by column '{group_by_column}' not found")
    if target_column not in df.columns:
        raise HTTPException(status_code=400, detail=f"Target column '{target_column}' not found")

    valid_funcs = ["sum", "mean", "count", "min", "max", "std"]
    if aggregation_func not in valid_funcs:
        raise HTTPException(status_code=400, detail=f"Unsupported aggregation: {aggregation_func}. Valid: {valid_funcs}")

    try:
        grouped = df.groupby(group_by_column)[target_column].agg(aggregation_func).reset_index()
        grouped.columns = [group_by_column, f"{target_column}_{aggregation_func}"]
        result = grouped.to_dict(orient="records")
        for row in result:
            for k, v in row.items():
                if pd.isnull(v):
                    row[k] = None
                elif isinstance(v, (np.floating, float)):
                    row[k] = round(float(v), 4)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to execute group-by aggregation: {str(e)}")

def compute_correlation_matrix(df: pd.DataFrame, method: str = "pearson") -> Dict[str, Any]:
    numeric_df = df.select_dtypes(include=[np.number])
    if numeric_df.shape[1] < 2:
        return {"columns": list(numeric_df.columns), "matrix": []}

    corr_df = numeric_df.corr(method=method).fillna(0)
    columns = list(corr_df.columns)
    matrix = []
    
    for row_col in columns:
        row_vals = []
        for col_col in columns:
            val = corr_df.loc[row_col, col_col]
            row_vals.append(round(float(val), 4))
        matrix.append(row_vals)

    return {
        "method": method,
        "columns": columns,
        "matrix": matrix
    }

def compute_distribution(df: pd.DataFrame, column: str) -> Dict[str, Any]:
    if column not in df.columns:
        raise HTTPException(status_code=400, detail=f"Column '{column}' not found")

    col_series = df[column].dropna()
    total_count = len(col_series)
    
    if pd.api.types.is_numeric_dtype(col_series) and col_series.nunique() > 10:
        counts, bin_edges = np.histogram(col_series, bins=10)
        histogram_data = []
        for i in range(len(counts)):
            label = f"{round(float(bin_edges[i]), 2)} - {round(float(bin_edges[i+1]), 2)}"
            histogram_data.append({
                "bin": label,
                "count": int(counts[i]),
                "percentage": round(float(counts[i] / total_count * 100), 2)
            })
        return {
            "column": column,
            "type": "numeric_binned",
            "total_count": total_count,
            "bins": histogram_data
        }
    else:
        counts_s = col_series.astype(str).value_counts()
        dist_data = []
        for val, count in counts_s.items():
            dist_data.append({
                "value": str(val),
                "count": int(count),
                "percentage": round(float(count / total_count * 100), 2)
            })
        return {
            "column": column,
            "type": "categorical",
            "total_count": total_count,
            "distribution": dist_data
        }
