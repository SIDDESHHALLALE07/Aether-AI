import pandas as pd
import numpy as np
from typing import Dict, Any, Tuple
from fastapi import HTTPException, status

def apply_cleaning(df: pd.DataFrame, operation_type: str, parameters: Dict[str, Any]) -> Tuple[pd.DataFrame, int]:
    cleaned_df = df.copy()
    initial_rows = len(cleaned_df)

    if operation_type == "drop_nulls":
        subset = parameters.get("subset") # list of columns or None
        if subset:
            cleaned_df = cleaned_df.dropna(subset=subset)
        else:
            cleaned_df = cleaned_df.dropna()

    elif operation_type == "impute_missing":
        column = parameters.get("column")
        strategy = parameters.get("strategy", "mean") # mean | median | mode | constant
        fill_value = parameters.get("fill_value")

        if not column or column not in cleaned_df.columns:
            raise HTTPException(status_code=400, detail=f"Column '{column}' not found in dataset")

        if strategy == "mean" and pd.api.types.is_numeric_dtype(cleaned_df[column]):
            val = cleaned_df[column].mean()
            cleaned_df[column] = cleaned_df[column].fillna(val)
        elif strategy == "median" and pd.api.types.is_numeric_dtype(cleaned_df[column]):
            val = cleaned_df[column].median()
            cleaned_df[column] = cleaned_df[column].fillna(val)
        elif strategy == "mode":
            mode_series = cleaned_df[column].mode()
            val = mode_series[0] if len(mode_series) > 0 else ""
            cleaned_df[column] = cleaned_df[column].fillna(val)
        elif strategy == "constant" and fill_value is not None:
            cleaned_df[column] = cleaned_df[column].fillna(fill_value)

    elif operation_type == "remove_duplicates":
        subset = parameters.get("subset")
        cleaned_df = cleaned_df.drop_duplicates(subset=subset)

    elif operation_type == "cast_type":
        column = parameters.get("column")
        target_type = parameters.get("target_type") # int | float | string | datetime
        if not column or column not in cleaned_df.columns:
            raise HTTPException(status_code=400, detail=f"Column '{column}' not found in dataset")

        try:
            if target_type in ["int", "int64", "integer"]:
                cleaned_df[column] = pd.to_numeric(cleaned_df[column], errors='coerce').fillna(0).astype(int)
            elif target_type in ["float", "float64"]:
                cleaned_df[column] = pd.to_numeric(cleaned_df[column], errors='coerce')
            elif target_type in ["str", "string", "object"]:
                cleaned_df[column] = cleaned_df[column].astype(str)
            elif target_type in ["datetime", "datetime64"]:
                cleaned_df[column] = pd.to_datetime(cleaned_df[column], errors='coerce')
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to cast column '{column}' to '{target_type}': {str(e)}")

    elif operation_type == "handle_outliers":
        column = parameters.get("column")
        action = parameters.get("action", "clip") # clip | drop
        if column and column in cleaned_df.columns and pd.api.types.is_numeric_dtype(cleaned_df[column]):
            q25, q75 = cleaned_df[column].quantile([0.25, 0.75])
            iqr = q75 - q25
            if iqr > 0:
                lower = q25 - 1.5 * iqr
                upper = q75 + 1.5 * iqr
                if action == "clip":
                    cleaned_df[column] = cleaned_df[column].clip(lower=lower, upper=upper)
                elif action == "drop":
                    cleaned_df = cleaned_df[(cleaned_df[column] >= lower) & (cleaned_df[column] <= upper)]

    else:
        raise HTTPException(status_code=400, detail=f"Unsupported cleaning operation: '{operation_type}'")

    affected_rows = abs(initial_rows - len(cleaned_df))
    return cleaned_df, affected_rows
