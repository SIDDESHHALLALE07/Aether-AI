import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional
from fastapi import HTTPException, status

def _safe_float(val: Any, default: float = 0.0, digits: Optional[int] = 2) -> float:
    try:
        f = float(val)
        if np.isnan(f) or np.isinf(f):
            return default
        return round(f, digits) if digits is not None else f
    except Exception:
        return default

def generate_chart_payload(
    df: pd.DataFrame,
    chart_type: str,
    x_column: Optional[str] = None,
    y_column: Optional[str] = None,
    group_by: Optional[str] = None,
    aggregation: Optional[str] = "sum",
    bins: Optional[int] = 15,
    selected_columns: Optional[List[str]] = None
) -> Dict[str, Any]:
    if df is None or df.empty:
        raise HTTPException(status_code=400, detail="Dataset is empty or contains no valid records.")

    chart_type_raw = (chart_type or "").lower().strip()

    # Normalize chart types
    if chart_type_raw in ["bar_vertical", "bar", "column"]:
        normalized_type = "bar_vertical"
    elif chart_type_raw in ["bar_horizontal", "horizontal_bar"]:
        normalized_type = "bar_horizontal"
    elif chart_type_raw == "line":
        normalized_type = "line"
    elif chart_type_raw == "area":
        normalized_type = "area"
    elif chart_type_raw == "scatter":
        normalized_type = "scatter"
    elif chart_type_raw == "histogram":
        normalized_type = "histogram"
    elif chart_type_raw == "box":
        normalized_type = "box"
    elif chart_type_raw == "heatmap":
        normalized_type = "heatmap"
    elif chart_type_raw == "pie":
        normalized_type = "pie"
    elif chart_type_raw == "donut":
        normalized_type = "donut"
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported chart type: {chart_type}")

    # --- 1. CORRELATION HEATMAP ---
    if normalized_type == "heatmap":
        if selected_columns and len(selected_columns) > 0:
            target_cols = [c for c in selected_columns if c in df.columns]
            num_cols = [c for c in target_cols if pd.api.types.is_numeric_dtype(df[c]) or pd.to_numeric(df[c], errors="coerce").notna().sum() > 0]
        else:
            num_cols = list(df.select_dtypes(include="number").columns)
            if len(num_cols) < 2:
                # Fallback: check columns convertible to numeric
                for c in df.columns:
                    if c not in num_cols:
                        conv = pd.to_numeric(df[c], errors="coerce")
                        if conv.notna().sum() > len(df) * 0.5:
                            num_cols.append(c)

        if len(num_cols) < 2:
            raise HTTPException(
                status_code=400,
                detail="Correlation Heatmap requires at least two numeric columns."
            )

        numeric_df = df[num_cols].apply(pd.to_numeric, errors="coerce")
        corr_matrix = numeric_df.corr().fillna(0).to_numpy()
        corr_matrix = np.nan_to_num(corr_matrix, nan=0.0, posinf=1.0, neginf=-1.0)
        matrix = [[_safe_float(v, default=0.0, digits=3) for v in row] for row in corr_matrix]

        return {
            "chart_type": "heatmap",
            "x_labels": list(num_cols),
            "y_labels": list(num_cols),
            "z_matrix": matrix,
            "title": f"Feature Correlation Matrix ({len(num_cols)} variables)"
        }

    # For all non-heatmap charts, x_column is required
    if not x_column or x_column not in df.columns:
        raise HTTPException(status_code=400, detail=f"Column '{x_column}' not found in dataset")
    if y_column and y_column not in df.columns:
        raise HTTPException(status_code=400, detail=f"Column '{y_column}' not found in dataset")
    if group_by and group_by not in df.columns:
        raise HTTPException(status_code=400, detail=f"Group-by column '{group_by}' not found in dataset")

    # --- 2. BAR CHARTS (VERTICAL & HORIZONTAL) ---
    if normalized_type in ["bar_vertical", "bar_horizontal"]:
        agg_func = (aggregation or "sum").lower()
        if agg_func not in ["sum", "mean", "count", "min", "max"]:
            agg_func = "sum"

        if y_column:
            y_numeric = pd.to_numeric(df[y_column], errors="coerce")
            valid_mask = y_numeric.notna() & df[x_column].notna()
            work_df = df[valid_mask].copy()
            work_df[y_column] = y_numeric[valid_mask]

            if len(work_df) == 0:
                raise HTTPException(status_code=400, detail=f"No valid numeric data in '{y_column}' to plot.")

            if group_by and group_by in df.columns and group_by != x_column:
                grouped = work_df.groupby([x_column, group_by])[y_column].agg(agg_func).unstack(fill_value=0).reset_index()
                categories = [str(c) for c in grouped[x_column].tolist()[:30]]
                series = []
                for col in grouped.columns[1:]:
                    vals = grouped[col].tolist()[:len(categories)]
                    series.append({
                        "name": str(col),
                        "data": [_safe_float(v) for v in vals]
                    })
            else:
                grouped = work_df.groupby(x_column)[y_column].agg(agg_func).reset_index()
                grouped = grouped.sort_values(by=y_column, ascending=False).head(30)
                categories = [str(c) for c in grouped[x_column].tolist()]
                series = [{
                    "name": f"{agg_func.capitalize()} of {y_column}",
                    "data": [_safe_float(v) for v in grouped[y_column].tolist()]
                }]
        else:
            if group_by and group_by in df.columns and group_by != x_column:
                valid_mask = df[x_column].notna() & df[group_by].notna()
                work_df = df[valid_mask]
                counts_2d = work_df.groupby([x_column, group_by]).size().unstack(fill_value=0).reset_index()
                categories = [str(c) for c in counts_2d[x_column].tolist()[:30]]
                series = []
                for col in counts_2d.columns[1:]:
                    vals = counts_2d[col].tolist()[:len(categories)]
                    series.append({
                        "name": str(col),
                        "data": [int(v) for v in vals]
                    })
            else:
                counts = df[x_column].dropna().value_counts().head(30)
                categories = [str(c) for c in counts.index.tolist()]
                series = [{
                    "name": "Observation Count",
                    "data": [int(v) for v in counts.values]
                }]

        if not categories or not series:
            raise HTTPException(status_code=400, detail="No valid data points found for bar chart.")

        return {
            "chart_type": normalized_type,
            "x_axis_title": x_column if normalized_type == "bar_vertical" else (y_column or "Count"),
            "y_axis_title": (y_column or "Count") if normalized_type == "bar_vertical" else x_column,
            "categories": categories,
            "series": series,
            "aggregation": agg_func if y_column else "count"
        }

    # --- 3. LINE & AREA CHARTS ---
    if normalized_type in ["line", "area"]:
        agg_func = (aggregation or "sum").lower()
        if agg_func not in ["sum", "mean", "count", "min", "max"]:
            agg_func = "sum"

        if y_column:
            y_numeric = pd.to_numeric(df[y_column], errors="coerce")
            valid_mask = y_numeric.notna() & df[x_column].notna()
            work_df = df[valid_mask].copy()
            work_df[y_column] = y_numeric[valid_mask]

            if len(work_df) == 0:
                raise HTTPException(status_code=400, detail=f"No valid numeric data in '{y_column}' for time series/metric plot.")

            if group_by and group_by in df.columns and group_by != x_column:
                grouped = work_df.groupby([x_column, group_by])[y_column].agg(agg_func).unstack(fill_value=0).reset_index()
                try:
                    grouped["__sort_key"] = pd.to_datetime(grouped[x_column], errors="coerce")
                    grouped = grouped.sort_values(by="__sort_key").drop(columns=["__sort_key"])
                except Exception:
                    try:
                        grouped["__sort_key"] = pd.to_numeric(grouped[x_column], errors="coerce")
                        grouped = grouped.sort_values(by="__sort_key").drop(columns=["__sort_key"])
                    except Exception:
                        grouped = grouped.sort_values(by=x_column)

                categories = [str(c) for c in grouped[x_column].tolist()[:60]]
                series = []
                for col in grouped.columns[1:]:
                    vals = grouped[col].tolist()[:len(categories)]
                    series.append({
                        "name": str(col),
                        "data": [_safe_float(v) for v in vals]
                    })
            else:
                grouped = work_df.groupby(x_column)[y_column].agg(agg_func).reset_index()
                try:
                    grouped["__sort_key"] = pd.to_datetime(grouped[x_column], errors="coerce")
                    grouped = grouped.sort_values(by="__sort_key").drop(columns=["__sort_key"])
                except Exception:
                    try:
                        grouped["__sort_key"] = pd.to_numeric(grouped[x_column], errors="coerce")
                        grouped = grouped.sort_values(by="__sort_key").drop(columns=["__sort_key"])
                    except Exception:
                        grouped = grouped.sort_values(by=x_column)

                categories = [str(c) for c in grouped[x_column].tolist()[:60]]
                series = [{
                    "name": f"{agg_func.capitalize()} of {y_column}",
                    "data": [_safe_float(v) for v in grouped[y_column].tolist()[:60]]
                }]
            y_title = f"{agg_func.capitalize()} of {y_column}"
        else:
            # Single numeric sequence
            x_numeric = pd.to_numeric(df[x_column], errors="coerce").dropna()
            if len(x_numeric) == 0:
                raise HTTPException(status_code=400, detail=f"Column '{x_column}' contains no numeric sequence.")
            categories = [str(i) for i in range(1, min(len(x_numeric) + 1, 101))]
            series = [{
                "name": x_column,
                "data": [_safe_float(v) for v in x_numeric.head(100).tolist()]
            }]
            y_title = x_column

        return {
            "chart_type": normalized_type,
            "x_axis_title": x_column,
            "y_axis_title": y_title,
            "categories": categories,
            "series": series
        }

    # --- 4. SCATTER PLOT ---
    if normalized_type == "scatter":
        if not y_column:
            raise HTTPException(status_code=400, detail="Scatter plot requires two numeric columns (X Axis and Y Axis).")

        x_num = pd.to_numeric(df[x_column], errors="coerce")
        y_num = pd.to_numeric(df[y_column], errors="coerce")
        valid_mask = x_num.notna() & y_num.notna()
        clean_df = df[valid_mask].copy()
        clean_df["_x"] = x_num[valid_mask]
        clean_df["_y"] = y_num[valid_mask]

        if len(clean_df) == 0:
            raise HTTPException(status_code=400, detail="Scatter plot requires numeric values in both X and Y columns.")

        # Sample for fast rendering
        sample_df = clean_df.head(1000)
        points = []
        for _, row in sample_df.iterrows():
            points.append({
                "x": _safe_float(row["_x"], digits=3),
                "y": _safe_float(row["_y"], digits=3),
                "category": str(row[group_by]) if group_by and group_by in df.columns and pd.notnull(row[group_by]) else "Data Point"
            })

        return {
            "chart_type": "scatter",
            "x_axis_title": x_column,
            "y_axis_title": y_column,
            "points": points,
            "group_by": group_by
        }

    # --- 5. HISTOGRAM ---
    if normalized_type == "histogram":
        s = pd.to_numeric(df[x_column], errors="coerce").dropna()
        if len(s) == 0:
            raise HTTPException(status_code=400, detail=f"Histogram requires a numeric column. '{x_column}' contains no numeric values.")

        num_bins = max(5, min(int(bins or 15), 60))
        counts, bin_edges = np.histogram(s, bins=num_bins)
        bins_data = []
        for i in range(len(counts)):
            low = _safe_float(bin_edges[i], digits=2)
            high = _safe_float(bin_edges[i + 1], digits=2)
            bins_data.append({
                "range": f"{low} – {high}",
                "count": int(counts[i]),
                "start": low,
                "end": high
            })

        return {
            "chart_type": "histogram",
            "x_axis_title": f"{x_column} (Binned)",
            "y_axis_title": "Frequency Count",
            "bins": bins_data,
            "bin_count": num_bins,
            "total_observations": len(s),
            "raw_values": [_safe_float(v, digits=2) for v in s.head(1000).tolist()]
        }

    # --- 6. BOX PLOT ---
    if normalized_type == "box":
        s = pd.to_numeric(df[x_column], errors="coerce")
        valid_mask = s.notna()

        if not valid_mask.any():
            raise HTTPException(status_code=400, detail=f"Box plot requires a numeric column. '{x_column}' contains no numeric values.")

        if group_by and group_by in df.columns and group_by != x_column:
            work_df = df[valid_mask & df[group_by].notna()].copy()
            work_df["_val"] = s[valid_mask]
            top_groups = work_df[group_by].value_counts().head(8).index.tolist()
            raw_data = []
            for g in top_groups:
                sub = work_df[work_df[group_by] == g]["_val"].tolist()
                for v in sub[:250]:
                    raw_data.append({"category": str(g), "value": _safe_float(v)})

            clean_s = work_df["_val"]
            q25, q50, q75 = clean_s.quantile([0.25, 0.50, 0.75])
            iqr = q75 - q25
            outliers = clean_s[(clean_s < q25 - 1.5 * iqr) | (clean_s > q75 + 1.5 * iqr)].tolist()
            return {
                "chart_type": "box",
                "column": x_column,
                "group_column": group_by,
                "min": _safe_float(clean_s.min()),
                "q1": _safe_float(q25),
                "median": _safe_float(q50),
                "q3": _safe_float(q75),
                "max": _safe_float(clean_s.max()),
                "outliers": [_safe_float(o) for o in outliers[:100]],
                "raw_data": raw_data
            }
        else:
            clean_s = s[valid_mask]
            q25, q50, q75 = clean_s.quantile([0.25, 0.50, 0.75])
            iqr = q75 - q25
            lower = q25 - 1.5 * iqr
            upper = q75 + 1.5 * iqr
            outliers = clean_s[(clean_s < lower) | (clean_s > upper)].tolist()
            raw_data = [{"category": x_column, "value": _safe_float(v)} for v in clean_s.head(500)]

            return {
                "chart_type": "box",
                "column": x_column,
                "min": _safe_float(clean_s.min()),
                "q1": _safe_float(q25),
                "median": _safe_float(q50),
                "q3": _safe_float(q75),
                "max": _safe_float(clean_s.max()),
                "outliers": [_safe_float(o) for o in outliers[:100]],
                "raw_data": raw_data
            }

    # --- 7. PIE & DONUT CHARTS ---
    if normalized_type in ["pie", "donut"]:
        if y_column:
            y_num = pd.to_numeric(df[y_column], errors="coerce")
            valid_mask = y_num.notna() & df[x_column].notna()
            work_df = df[valid_mask].copy()
            work_df["_y"] = y_num[valid_mask]

            if len(work_df) == 0:
                raise HTTPException(status_code=400, detail=f"No valid numeric data in '{y_column}' to compute proportions.")

            agg_func = (aggregation or "sum").lower()
            if agg_func not in ["sum", "mean", "count"]:
                agg_func = "sum"

            grouped = work_df.groupby(x_column)["_y"].agg(agg_func).sort_values(ascending=False)
            if len(grouped) == 0:
                raise HTTPException(status_code=400, detail="No categories available for proportional chart.")

            if len(grouped) > 8:
                top = grouped.head(7)
                other_val = grouped.iloc[7:].sum() if agg_func == "sum" else grouped.iloc[7:].mean()
                labels = [str(k) for k in top.index.tolist()] + ["Other"]
                values = [_safe_float(v) for v in top.values] + [_safe_float(other_val)]
            else:
                labels = [str(k) for k in grouped.index.tolist()]
                values = [_safe_float(v) for v in grouped.values]
        else:
            counts = df[x_column].dropna().value_counts()
            if len(counts) == 0:
                raise HTTPException(status_code=400, detail=f"Column '{x_column}' contains no category values.")

            if len(counts) > 8:
                top = counts.head(7)
                other_val = int(counts.iloc[7:].sum())
                labels = [str(k) for k in top.index.tolist()] + ["Other"]
                values = [int(v) for v in top.values] + [other_val]
            else:
                labels = [str(k) for k in counts.index.tolist()]
                values = [int(v) for v in counts.values]

        return {
            "chart_type": normalized_type,
            "title": f"Proportional Share: {x_column}" + (f" by {y_column}" if y_column else ""),
            "labels": labels,
            "values": values,
            "is_donut": normalized_type == "donut"
        }

    raise HTTPException(status_code=400, detail=f"Unsupported chart type: {chart_type}")


def recommend_charts(df: pd.DataFrame) -> List[Dict[str, Any]]:
    if df is None or df.empty:
        return []

    recommendations = []
    numeric_cols = list(df.select_dtypes(include="number").columns)
    obj_cols = list(df.select_dtypes(include="object").columns)
    cat_cols_raw = list(df.select_dtypes(include="category").columns)
    cat_cols = list(dict.fromkeys(obj_cols + cat_cols_raw))

    # Detect date/time columns
    dt_cols = list(df.select_dtypes(include=["datetime", "datetimetz"]).columns)
    for col in df.columns:
        if col not in dt_cols and col not in numeric_cols:
            col_l = col.lower()
            if any(term in col_l for term in ["date", "time", "year", "month", "day", "timestamp"]):
                dt_cols.append(col)

    # 1. Bar Chart recommendation
    if len(cat_cols) >= 1 and len(numeric_cols) >= 1:
        recommendations.append({
            "title": f"Average {numeric_cols[0]} by {cat_cols[0]}",
            "chart_type": "bar_vertical",
            "x_column": cat_cols[0],
            "y_column": numeric_cols[0],
            "aggregation": "mean",
            "reason": "Compares continuous metric averages across distinct categories."
        })

    # 2. Line Chart recommendation (if date column exists)
    if len(dt_cols) >= 1 and len(numeric_cols) >= 1:
        recommendations.append({
            "title": f"{numeric_cols[0]} Trend over {dt_cols[0]}",
            "chart_type": "line",
            "x_column": dt_cols[0],
            "y_column": numeric_cols[0],
            "aggregation": "mean",
            "reason": "Tracks temporal trends and metric progression across dates."
        })

    # 3. Scatter Plot recommendation
    if len(numeric_cols) >= 2:
        recommendations.append({
            "title": f"{numeric_cols[0]} vs {numeric_cols[1]} Scatter Plot",
            "chart_type": "scatter",
            "x_column": numeric_cols[0],
            "y_column": numeric_cols[1],
            "reason": "Evaluates correlation, point dispersion, and bivariate clustering."
        })

    # 4. Donut / Pie recommendation
    if len(cat_cols) >= 1:
        unique_cnt = df[cat_cols[0]].nunique()
        if 2 <= unique_cnt <= 8:
            recommendations.append({
                "title": f"{cat_cols[0]} Proportions (Donut)",
                "chart_type": "donut",
                "x_column": cat_cols[0],
                "reason": "Visualizes category relative distribution and market share."
            })

    # 5. Histogram recommendation
    if len(numeric_cols) >= 1:
        recommendations.append({
            "title": f"{numeric_cols[0]} Distribution Histogram",
            "chart_type": "histogram",
            "x_column": numeric_cols[0],
            "reason": "Analyzes variance, frequency distribution, and skewness."
        })

    # 6. Box Plot recommendation
    if len(numeric_cols) >= 1:
        recommendations.append({
            "title": f"{numeric_cols[0]} Statistical Box Plot",
            "chart_type": "box",
            "x_column": numeric_cols[0],
            "group_by": cat_cols[0] if len(cat_cols) > 0 else None,
            "reason": "Detects statistical outliers, interquartile range (IQR), and medians."
        })

    # 7. Correlation Heatmap recommendation
    if len(numeric_cols) >= 2:
        recommendations.append({
            "title": f"Correlation Heatmap ({len(numeric_cols)} Metrics)",
            "chart_type": "heatmap",
            "x_column": numeric_cols[0],
            "reason": "Computes Pearson correlation matrix across numerical variables."
        })

    return recommendations[:6]

