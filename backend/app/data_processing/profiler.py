import pandas as pd
import numpy as np
from typing import Dict, Any, Tuple

def profile_dataset(df: pd.DataFrame) -> Tuple[Dict[str, Any], Dict[str, Any], Dict[str, Any], Dict[str, Any]]:
    numeric_summary = {}
    categorical_summary = {}
    datetime_summary = {}
    data_types = {}

    for col in df.columns:
        col_series = df[col]
        dtype_str = str(col_series.dtype)
        data_types[col] = dtype_str

        # Numeric Profiling
        if pd.api.types.is_numeric_dtype(col_series):
            clean_s = col_series.dropna()
            if len(clean_s) > 0:
                q25, q50, q75 = clean_s.quantile([0.25, 0.50, 0.75]).tolist()
                numeric_summary[col] = {
                    "count": len(clean_s),
                    "min": float(clean_s.min()),
                    "max": float(clean_s.max()),
                    "mean": clean_s.mean(),
                    "median": float(q50),
                    "std": clean_s.std() if len(clean_s) > 1 else 0.0,
                    "skewness": round(float(clean_s.skew()), 4) if len(clean_s) > 2 and pd.notnull(clean_s.skew()) else 0.0,  # type: ignore[arg-type]
                    "q25": float(q25),
                    "q50": float(q50),
                    "q75": float(q75),
                    "zero_count": (clean_s == 0).sum(),
                    "null_count": col_series.isnull().sum()
                }
            else:
                numeric_summary[col] = {"count": 0, "null_count": col_series.isnull().sum()}

        # Categorical / Object Profiling
        elif pd.api.types.is_object_dtype(col_series) or pd.api.types.is_string_dtype(col_series) or isinstance(col_series.dtype, pd.CategoricalDtype):
            clean_s = col_series.dropna().astype(str)
            top_counts = clean_s.value_counts().head(5).to_dict()
            categorical_summary[col] = {
                "unique_count": clean_s.nunique(),
                "null_count": col_series.isnull().sum(),
                "top_values": {str(k): v for k, v in top_counts.items()},
                "mode": clean_s.mode()[0] if len(clean_s) > 0 else None
            }

        # Datetime Profiling
        elif pd.api.types.is_datetime64_any_dtype(col_series):
            clean_s = col_series.dropna()
            if len(clean_s) > 0:
                min_date = clean_s.min()
                max_date = clean_s.max()
                datetime_summary[col] = {
                    "min_date": str(min_date),
                    "max_date": str(max_date),
                    "null_count": col_series.isnull().sum(),
                    "days_range": int((max_date - min_date).days)
                }

    return numeric_summary, categorical_summary, datetime_summary, data_types
