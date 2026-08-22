import pandas as pd
import numpy as np
from typing import Dict, Any, Tuple
from fastapi import HTTPException, status

def load_dataframe(file_path: str, file_type: str) -> pd.DataFrame:
    try:
        if file_type.lower() in ["csv", ".csv"]:
            df = pd.read_csv(file_path)
        elif file_type.lower() in ["xlsx", "xls", ".xlsx", ".xls"]:
            df = pd.read_excel(file_path)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file format: {file_type}. Supported: CSV, XLSX, XLS"
            )
        return df
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to parse dataset file: {str(e)}"
        )

def extract_metadata(df: pd.DataFrame) -> Tuple[int, int, Dict[str, Any]]:
    row_count = len(df)
    col_count = len(df.columns)
    
    columns_meta = {}
    for col in df.columns:
        dtype = str(df[col].dtype)
        null_count = int(df[col].isnull().sum())
        unique_count = int(df[col].nunique())
        columns_meta[str(col)] = {
            "dtype": dtype,
            "null_count": null_count,
            "unique_count": unique_count,
            "sample_values": [str(x) if pd.notnull(x) else None for x in df[col].dropna().head(3).tolist()]
        }
        
    return row_count, col_count, columns_meta
