import os
import csv
import json
import logging
from typing import Dict, Any, Tuple, Optional, cast
import pandas as pd
from fastapi import HTTPException, status

logger = logging.getLogger("uvicorn.error")

def _detect_encoding_and_delimiter(file_path: str) -> Tuple[str, str]:
    """
    Detect encoding and delimiter for a CSV file.
    Returns (encoding, delimiter).
    """
    sample_bytes = b""
    with open(file_path, "rb") as f:
        sample_bytes = f.read(65536)

    if not sample_bytes:
        return "utf-8", ","

    # 1. Detect encoding
    detected_encoding = "utf-8"
    try:
        from charset_normalizer import from_bytes
        match = from_bytes(sample_bytes).best()
        if match and match.encoding:
            detected_encoding = match.encoding
    except Exception:
        pass

    candidate_encodings = [detected_encoding, "utf-8-sig", "utf-8", "cp1252", "latin1", "iso-8859-1"]
    seen = set()
    unique_candidates = [e for e in candidate_encodings if e and not (e.lower() in seen or seen.add(e.lower()))]

    working_encoding = "utf-8"
    sample_text = ""
    for enc in unique_candidates:
        try:
            sample_text = sample_bytes.decode(enc)
            working_encoding = enc
            break
        except (UnicodeDecodeError, LookupError):
            continue

    if not sample_text:
        working_encoding = "latin1"
        sample_text = sample_bytes.decode("latin1", errors="replace")

    # 2. Detect delimiter
    delimiter = ","
    try:
        # Use first 8KB of sample text for sniffer
        sniff_text = sample_text[:8192]
        lines = [line for line in sniff_text.splitlines() if line.strip()]
        if lines:
            test_chunk = "\n".join(lines[:10])
            sniffer = csv.Sniffer()
            dialect = sniffer.sniff(test_chunk, delimiters=",;\t|:")
            if dialect and dialect.delimiter:
                delimiter = dialect.delimiter
    except Exception:
        first_line = sample_text.splitlines()[0] if sample_text.splitlines() else ""
        counts = {',': first_line.count(','), ';': first_line.count(';'), '\t': first_line.count('\t'), '|': first_line.count('|')}
        best_delim = max(counts, key=lambda k: counts[k])
        if counts[best_delim] > 0:
            delimiter = best_delim
        else:
            delimiter = ","

    return working_encoding, delimiter


def _load_csv(file_path: str) -> pd.DataFrame:
    encoding, delimiter = _detect_encoding_and_delimiter(file_path)
    try:
        df = pd.read_csv(file_path, sep=delimiter, encoding=encoding, on_bad_lines="skip")
        return df
    except Exception:
        try:
            df = pd.read_csv(file_path, sep=None, engine="python", encoding=encoding, on_bad_lines="skip")
            return df
        except Exception as e:
            logger.warning(f"Failed to parse CSV with detected parameters: {e}")
            try:
                df = pd.read_csv(file_path, encoding="utf-8", encoding_errors="replace")
                return df
            except Exception:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Failed to parse CSV file. Delimiter or encoding could not be resolved."
                )


def _load_excel(file_path: str, ext: str) -> pd.DataFrame:
    is_xlsx = ext in ["xlsx", ".xlsx"]
    is_xls = ext in ["xls", ".xls"]

    if is_xlsx:
        try:
            import openpyxl  # type: ignore # noqa: F401
        except (ImportError, ModuleNotFoundError):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Excel parser dependency is unavailable. Please install openpyxl."
            )
        try:
            df = pd.read_excel(file_path, engine="openpyxl")
            return df
        except HTTPException:
            raise
        except Exception as e:
            err_str = str(e).lower()
            if "openpyxl" in err_str:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Excel parser dependency is unavailable. Please install openpyxl."
                )
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Failed to parse Excel (.xlsx) file. The file may be corrupt or invalid."
            )

    elif is_xls:
        try:
            import xlrd  # type: ignore # noqa: F401
        except (ImportError, ModuleNotFoundError):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Excel parser dependency is unavailable. Please install xlrd."
            )
        try:
            df = pd.read_excel(file_path, engine="xlrd")
            return df
        except HTTPException:
            raise
        except Exception as e:
            err_str = str(e).lower()
            if "xlrd" in err_str:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Excel parser dependency is unavailable. Please install xlrd."
                )
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Failed to parse legacy Excel (.xls) file. The file may be corrupt or invalid."
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported Excel format: {ext}"
        )


def _load_json(file_path: str) -> pd.DataFrame:
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except UnicodeDecodeError:
        try:
            with open(file_path, "r", encoding="latin1") as f:
                data = json.load(f)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid JSON dataset: Unable to decode file as UTF-8 or Latin-1."
            )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON dataset: File does not contain valid JSON syntax."
        )

    if isinstance(data, list):
        if len(data) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded dataset is empty. JSON list contains no records."
            )
        if not all(isinstance(row, dict) for row in data):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid JSON dataset: Array elements must be key-value objects."
            )
        return pd.DataFrame(data)

    elif isinstance(data, dict):
        if "data" in data and isinstance(data["data"], list) and "columns" in data and isinstance(data["columns"], list):
            return pd.DataFrame(data["data"], columns=data["columns"])
        
        if all(isinstance(v, list) for v in data.values()):
            return pd.DataFrame(data)

        return pd.DataFrame([data])
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON dataset structure. JSON must be an array of objects or columnar dictionary."
        )


def load_dataframe(file_path: str, file_type: str) -> pd.DataFrame:
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset file not found on storage."
        )

    file_size = os.path.getsize(file_path)
    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty (0 bytes)."
        )

    fmt = file_type.lower().lstrip(".")

    if fmt == "csv":
        df = _load_csv(file_path)
    elif fmt == "xlsx":
        df = _load_excel(file_path, "xlsx")
    elif fmt == "xls":
        df = _load_excel(file_path, "xls")
    elif fmt == "json":
        df = _load_json(file_path)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format: .{fmt}. Supported formats are .csv, .xlsx, .xls, and .json."
        )

    if df is None or df.empty or len(df.columns) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dataset contains no readable rows or columns."
        )

    cleaned_columns = []
    for i, col in enumerate(df.columns):
        c_str = f"{col}".strip()
        if not c_str or c_str.lower().startswith("unnamed:"):
            c_str = f"column_{i + 1}"
        cleaned_columns.append(c_str)
    df.columns = cleaned_columns

    return df

def extract_metadata(df: pd.DataFrame) -> Tuple[int, int, Dict[str, Any]]:
    row_count = len(df)
    col_count = len(df.columns)
    
    columns_meta = {}
    for col in df.columns:
        dtype = str(df[col].dtype)
        null_count = int(cast(Any, df[col].isnull().sum()))
        unique_count = int(cast(Any, df[col].nunique()))
        columns_meta[col] = {
            "dtype": dtype,
            "null_count": null_count,
            "unique_count": unique_count,
            "sample_values": [str(x) if pd.notnull(x) else None for x in df[col].dropna().head(3).tolist()]
        }
        
    return row_count, col_count, columns_meta
