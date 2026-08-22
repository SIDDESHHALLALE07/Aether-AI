import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional
from fastapi import HTTPException, status

def generate_chart_payload(
    df: pd.DataFrame,
    chart_type: str,
    x_column: str,
    y_column: Optional[str] = None,
    group_by: Optional[str] = None,
    aggregation: Optional[str] = "sum"
) -> Dict[str, Any]:
    if x_column not in df.columns:
        raise HTTPException(status_code=400, detail=f"Column '{x_column}' not found in dataset")
    if y_column and y_column not in df.columns:
        raise HTTPException(status_code=400, detail=f"Column '{y_column}' not found in dataset")
    if group_by and group_by not in df.columns:
        raise HTTPException(status_code=400, detail=f"Group-by column '{group_by}' not found in dataset")

    chart_type = chart_type.lower()

    if chart_type in ["bar", "column"]:
        if y_column:
            agg_func = aggregation or "sum"
            if group_by:
                grouped = df.groupby([x_column, group_by])[y_column].agg(agg_func).unstack(fill_value=0).reset_index()
                series = []
                for col in grouped.columns[1:]:
                    series.append({
                        "name": str(col),
                        "data": [round(float(v), 2) for v in grouped[col].tolist()]
                    })
                categories = [str(c) for c in grouped[x_column].tolist()]
            else:
                grouped = df.groupby(x_column)[y_column].agg(agg_func).reset_index()
                series = [{
                    "name": y_column,
                    "data": [round(float(v), 2) for v in grouped[y_column].tolist()]
                }]
                categories = [str(c) for c in grouped[x_column].tolist()]
        else:
            counts = df[x_column].value_counts().head(20)
            categories = [str(c) for c in counts.index.tolist()]
            series = [{
                "name": "Frequency Count",
                "data": [int(v) for v in counts.values.tolist()]
            }]
            
        return {
            "chart_type": "bar",
            "x_axis_title": x_column,
            "y_axis_title": y_column or "Count",
            "categories": categories,
            "series": series
        }

    elif chart_type == "line":
        sorted_df = df.sort_values(by=x_column)
        if y_column:
            data_points = sorted_df[[x_column, y_column]].dropna().to_dict(orient="records")
            categories = [str(r[x_column]) for r in data_points]
            series = [{
                "name": y_column,
                "data": [round(float(r[y_column]), 2) for r in data_points]
            }]
        else:
            categories = list(range(1, len(sorted_df) + 1))
            series = [{
                "name": x_column,
                "data": [round(float(v), 2) for v in sorted_df[x_column].tolist()]
            }]
        return {
            "chart_type": "line",
            "x_axis_title": x_column,
            "y_axis_title": y_column or x_column,
            "categories": categories,
            "series": series
        }

    elif chart_type == "scatter":
        if not y_column:
            raise HTTPException(status_code=400, detail="Scatter plot requires both x_column and y_column")
        clean_df = df[[x_column, y_column] + ([group_by] if group_by else [])].dropna()
        
        points = []
        for _, row in clean_df.head(500).iterrows():
            points.append({
                "x": round(float(row[x_column]), 2),
                "y": round(float(row[y_column]), 2),
                "category": str(row[group_by]) if group_by else "default"
            })
        return {
            "chart_type": "scatter",
            "x_axis_title": x_column,
            "y_axis_title": y_column,
            "points": points
        }

    elif chart_type == "histogram":
        clean_s = df[x_column].dropna()
        counts, bin_edges = np.histogram(clean_s, bins=10)
        bins = []
        for i in range(len(counts)):
            bins.append({
                "range": f"{round(float(bin_edges[i]), 2)} - {round(float(bin_edges[i+1]), 2)}",
                "count": int(counts[i])
            })
        return {
            "chart_type": "histogram",
            "x_axis_title": x_column,
            "y_axis_title": "Frequency",
            "bins": bins
        }

    elif chart_type == "heatmap":
        numeric_df = df.select_dtypes(include=[np.number])
        corr_df = numeric_df.corr().fillna(0)
        cols = list(corr_df.columns)
        matrix = []
        for row in cols:
            matrix.append([round(float(corr_df.loc[row, col]), 3) for col in cols])
        return {
            "chart_type": "heatmap",
            "x_labels": cols,
            "y_labels": cols,
            "z_matrix": matrix
        }

    elif chart_type == "box":
        clean_s = df[x_column].dropna()
        q25, q50, q75 = clean_s.quantile([0.25, 0.50, 0.75])
        iqr = q75 - q25
        lower = q25 - 1.5 * iqr
        upper = q75 + 1.5 * iqr
        outliers = clean_s[(clean_s < lower) | (clean_s > upper)].tolist()
        return {
            "chart_type": "box",
            "column": x_column,
            "min": round(float(clean_s.min()), 2),
            "q1": round(float(q25), 2),
            "median": round(float(q50), 2),
            "q3": round(float(q75), 2),
            "max": round(float(clean_s.max()), 2),
            "outliers": [round(float(o), 2) for o in outliers]
        }

    elif chart_type in ["pie", "donut"]:
        counts = df[x_column].value_counts().head(10)
        return {
            "chart_type": "pie",
            "title": f"Distribution of {x_column}",
            "labels": [str(k) for k in counts.index.tolist()],
            "values": [int(v) for v in counts.values.tolist()]
        }

    else:
        raise HTTPException(status_code=400, detail=f"Unsupported chart type: {chart_type}")

def recommend_charts(df: pd.DataFrame) -> List[Dict[str, Any]]:
    recommendations = []
    numeric_cols = list(df.select_dtypes(include=[np.number]).columns)
    cat_cols = list(df.select_dtypes(include=["object", "string", "category"]).columns)

    if len(numeric_cols) >= 2:
        recommendations.append({
            "title": f"Correlation Heatmap ({len(numeric_cols)} Numeric Metrics)",
            "chart_type": "heatmap",
            "x_column": numeric_cols[0],
            "reason": "Examines linear correlation patterns across all numeric variables."
        })
        recommendations.append({
            "title": f"{numeric_cols[0]} vs {numeric_cols[1]} Scatter Plot",
            "chart_type": "scatter",
            "x_column": numeric_cols[0],
            "y_column": numeric_cols[1],
            "reason": "Identifies relationship and clustering between numeric dimensions."
        })

    if len(cat_cols) >= 1 and len(numeric_cols) >= 1:
        recommendations.append({
            "title": f"Average {numeric_cols[0]} by {cat_cols[0]}",
            "chart_type": "bar",
            "x_column": cat_cols[0],
            "y_column": numeric_cols[0],
            "aggregation": "mean",
            "reason": "Compares performance metrics across categories."
        })

    if len(cat_cols) >= 1:
        recommendations.append({
            "title": f"{cat_cols[0]} Breakdown (Pie Chart)",
            "chart_type": "pie",
            "x_column": cat_cols[0],
            "reason": "Visualizes categorical distribution and proportion."
        })

    return recommendations[:4]
