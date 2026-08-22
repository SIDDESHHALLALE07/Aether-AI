import pandas as pd
import io
from typing import Tuple, Any

DANGEROUS_PREFIXES = ('=', '+', '-', '@', '\t', '\r')

def sanitize_cell_for_export(val: Any) -> Any:
    if isinstance(val, str):
        if val.startswith(DANGEROUS_PREFIXES):
            return f"'{val}"
    return val

def export_dataframe_safe(df: pd.DataFrame, file_format: str = "csv") -> Tuple[bytes, str, str]:
    # Apply Formula Injection Sanitization across all object/string columns
    safe_df = df.copy()
    for col in safe_df.columns:
        if safe_df[col].dtype == "object":
            safe_df[col] = safe_df[col].apply(sanitize_cell_for_export)

    if file_format.lower() in ["excel", "xlsx"]:
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine="openpyxl") as writer:
            safe_df.to_excel(writer, index=False)
        content = output.getvalue()
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        filename_ext = ".xlsx"
    else:
        content = safe_df.to_csv(index=False).encode("utf-8")
        media_type = "text/csv"
        filename_ext = ".csv"

    return content, media_type, filename_ext
