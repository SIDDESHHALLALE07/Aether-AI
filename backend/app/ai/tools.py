import os
import math
from typing import Dict, Any, List, Optional, Tuple, cast
import pandas as pd
import numpy as np
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.dataset import Dataset, DatasetVersion
from app.models.project import Project
from app.models.profile import DataProfile, QualityScore
from app.models.analytics import PatternResult, Insight
from app.models.cleaning import CleaningOperation
from app.models.report import Report
from app.data_processing.loader import load_dataframe
from app.analytics.visualization import generate_chart_payload
from app.analytics.engine import (
    compute_summary_statistics,
    compute_correlation_matrix,
    compute_distribution
)
from app.reports.analysis_engine import analyze_dataset_for_report
from app.reports.pdf_generator import generate_executive_pdf_report


def _get_dataset_and_version(dataset_id: str, db: Session, user_id: str) -> Tuple[Dataset, DatasetVersion]:
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise ValueError(f"Dataset with ID '{dataset_id}' not found.")
    if dataset.user_id != user_id:
        raise PermissionError("You do not have permission to access this dataset.")

    version = db.query(DatasetVersion).filter(
        DatasetVersion.dataset_id == dataset_id,
        DatasetVersion.version_number == dataset.current_version_num
    ).first()
    if not version:
        raise ValueError(f"Dataset version {dataset.current_version_num} not found.")

    return dataset, version


def _load_dataset_dataframe(dataset_id: str, db: Session, user_id: str) -> Tuple[Dataset, DatasetVersion, pd.DataFrame]:
    dataset, version = _get_dataset_and_version(dataset_id, db, user_id)
    if not os.path.exists(version.storage_path):
        raise FileNotFoundError(f"Underlying storage file not found at '{version.storage_path}'.")

    df = load_dataframe(version.storage_path, dataset.file_type)
    return dataset, version, df


# Tool 1: get_active_dataset
def get_active_dataset(dataset_id: str, db: Session, user_id: str) -> Dict[str, Any]:
    dataset, version = _get_dataset_and_version(dataset_id, db, user_id)
    project = db.query(Project).filter(Project.id == dataset.project_id).first()
    profile = db.query(DataProfile).filter(DataProfile.dataset_version_id == version.id).first()

    return {
        "dataset_id": dataset.id,
        "filename": dataset.original_filename,
        "project_id": dataset.project_id,
        "project_name": project.name if project else "Default Workspace",
        "version_number": version.version_number,
        "row_count": version.row_count,
        "column_count": version.column_count,
        "file_type": dataset.file_type,
        "file_size_bytes": dataset.file_size_bytes,
        "data_types": profile.data_types if profile else {},
        "created_at": str(dataset.created_at)
    }


# Tool 2: get_dataset_schema
def get_dataset_schema(dataset_id: str, db: Session, user_id: str) -> Dict[str, Any]:
    dataset, version, df = _load_dataset_dataframe(dataset_id, db, user_id)
    
    columns_info = []
    for col in df.columns:
        s = df[col]
        null_cnt = s.isnull().sum()
        uniq_cnt = s.nunique(dropna=True)
        
        inferred = "categorical"
        if pd.api.types.is_numeric_dtype(s):
            inferred = "numeric"
        elif pd.api.types.is_datetime64_any_dtype(s):
            inferred = "datetime"
        elif pd.api.types.is_bool_dtype(s):
            inferred = "boolean"
        elif uniq_cnt == len(df) and len(df) > 20:
            inferred = "identifier"

        sample_vals = [None if pd.isna(v) else (int(v) if isinstance(v, (np.integer, int)) else float(v) if isinstance(v, (np.floating, float)) else str(v)) for v in s.dropna().head(3).tolist()]

        columns_info.append({
            "name": col,
            "type": inferred,
            "pandas_dtype": str(s.dtype),
            "null_count": null_cnt,
            "null_percentage": round((null_cnt / len(df)) * 100, 2) if len(df) > 0 else 0,
            "unique_count": uniq_cnt,
            "sample_values": sample_vals
        })

    return {
        "dataset_name": dataset.original_filename,
        "total_rows": len(df),
        "total_columns": len(df.columns),
        "columns": columns_info
    }


# Tool 3: query_dataset
def query_dataset(
    dataset_id: str,
    db: Session,
    user_id: str,
    query_type: str = "head",
    limit: int = 5,
    columns: Optional[List[str]] = None,
    filter_col: Optional[str] = None,
    filter_val: Optional[Any] = None,
    sort_by: Optional[str] = None,
    sort_ascending: bool = False
) -> Dict[str, Any]:
    dataset, version, df = _load_dataset_dataframe(dataset_id, db, user_id)
    limit = max(1, min(limit, 50))

    if columns:
        valid_cols = [c for c in columns if c in df.columns]
        if valid_cols:
            df = df[valid_cols]

    if filter_col and filter_col in df.columns and filter_val is not None:
        df = df[df[filter_col].astype(str).str.contains(str(filter_val), case=False, na=False)]

    if sort_by and sort_by in df.columns:
        df = df.sort_values(by=sort_by, ascending=sort_ascending)

    if query_type == "tail":
        result_df = df.tail(limit)
    else:
        result_df = df.head(limit)

    records = result_df.replace({np.nan: None}).to_dict(orient="records")
    return {
        "dataset_name": dataset.original_filename,
        "total_matching_rows": len(df),
        "returned_rows": len(records),
        "columns": list(result_df.columns),
        "rows": records
    }


# Tool 4: calculate_statistics
def calculate_statistics(
    dataset_id: str,
    db: Session,
    user_id: str,
    columns: Optional[List[str]] = None
) -> Dict[str, Any]:
    dataset, version, df = _load_dataset_dataframe(dataset_id, db, user_id)
    
    if columns:
        target_cols = [c for c in columns if c in df.columns and pd.api.types.is_numeric_dtype(df[c])]
    else:
        target_cols = list(df.select_dtypes(include="number").columns)

    if not target_cols:
        return {"error": "No valid numeric columns found to calculate statistics."}

    stats = {}
    for col in target_cols:
        clean = df[col].dropna()
        if len(clean) == 0:
            continue
        q25, q50, q75 = clean.quantile([0.25, 0.50, 0.75]).tolist()
        iqr = q75 - q25
        stats[col] = {
            "count": len(clean),
            "null_count": df[col].isnull().sum(),
            "mean": round(clean.mean(), 4),
            "std": round(clean.std(), 4) if len(clean) > 1 else 0.0,
            "min": round(float(clean.min()), 4),
            "q25": round(float(q25), 4),
            "median": round(float(q50), 4),
            "q75": round(float(q75), 4),
            "max": round(float(clean.max()), 4),
            "iqr": round(float(iqr), 4),
            "variance": round(float(cast(Any, clean.var())), 4) if len(clean) > 1 else 0.0,
            "skewness": round(float(cast(Any, clean.skew())), 4) if len(clean) > 2 and pd.notnull(clean.skew()) else 0.0
        }

    return {
        "dataset_name": dataset.original_filename,
        "total_rows": len(df),
        "statistics": stats
    }


# Tool 5: calculate_correlation
def calculate_correlation(
    dataset_id: str,
    db: Session,
    user_id: str,
    columns: Optional[List[str]] = None,
    method: str = "pearson"
) -> Dict[str, Any]:
    dataset, version, df = _load_dataset_dataframe(dataset_id, db, user_id)
    
    if columns and len(columns) >= 2:
        valid_cols = [c for c in columns if c in df.columns and pd.api.types.is_numeric_dtype(df[c])]
        if len(valid_cols) >= 2:
            df = df[valid_cols]

    matrix_data = compute_correlation_matrix(df, method=method)
    
    # Extract top strongest pairs
    cols = matrix_data.get("columns", [])
    matrix = matrix_data.get("matrix", [])
    pairs = []
    for i in range(len(cols)):
        for j in range(i + 1, len(cols)):
            val = matrix[i][j]
            pairs.append({
                "col1": cols[i],
                "col2": cols[j],
                "correlation": round(float(val), 4),
                "absolute_correlation": round(abs(float(val)), 4)
            })

    pairs.sort(key=lambda p: p["absolute_correlation"], reverse=True)

    return {
        "dataset_name": dataset.original_filename,
        "method": method,
        "columns": cols,
        "matrix": matrix,
        "top_correlated_pairs": pairs[:10]
    }


# Tool 6: detect_outliers
def detect_outliers(
    dataset_id: str,
    db: Session,
    user_id: str,
    columns: Optional[List[str]] = None,
    method: str = "iqr"
) -> Dict[str, Any]:
    dataset, version, df = _load_dataset_dataframe(dataset_id, db, user_id)
    
    if columns:
        num_cols = [c for c in columns if c in df.columns and pd.api.types.is_numeric_dtype(df[c])]
    else:
        num_cols = list(df.select_dtypes(include="number").columns)

    results = {}
    total_outliers_across_dataset = 0

    for col in num_cols:
        clean = df[col].dropna()
        if len(clean) < 4:
            continue
        
        if method.lower() == "zscore":
            mean = clean.mean()
            std = clean.std()
            if std == 0:
                continue
            z_scores = (clean - mean).abs() / std
            outliers = clean[z_scores > 3]
            lower_bound = round(mean - 3 * std, 2)
            upper_bound = round(mean + 3 * std, 2)
        else: # IQR default
            q25, q75 = clean.quantile([0.25, 0.75])
            iqr = q75 - q25
            lower_bound = round(float(q25 - 1.5 * iqr), 2)
            upper_bound = round(float(q75 + 1.5 * iqr), 2)
            outliers = clean[(clean < lower_bound) | (clean > upper_bound)]

        count = len(outliers)
        total_outliers_across_dataset += count
        pct = round((count / len(clean)) * 100, 2)
        
        sample_outlier_vals = [round(float(v), 2) for v in outliers.head(5).tolist()]
        results[col] = {
            "outlier_count": count,
            "outlier_percentage": pct,
            "lower_bound": lower_bound,
            "upper_bound": upper_bound,
            "min_detected": round(float(outliers.min()), 2) if count > 0 else None,
            "max_detected": round(float(outliers.max()), 2) if count > 0 else None,
            "sample_values": sample_outlier_vals
        }

    return {
        "dataset_name": dataset.original_filename,
        "method": method,
        "total_outliers_count": total_outliers_across_dataset,
        "column_outliers": results
    }


# Tool 7: analyze_missing_values
def analyze_missing_values(dataset_id: str, db: Session, user_id: str) -> Dict[str, Any]:
    dataset, version, df = _load_dataset_dataframe(dataset_id, db, user_id)
    total_rows = len(df)
    total_cells = total_rows * len(df.columns)
    
    missing_by_col = {}
    total_missing_cells = 0

    for col in df.columns:
        null_cnt = df[col].isnull().sum()
        total_missing_cells += null_cnt
        if null_cnt > 0:
            missing_by_col[col] = {
                "null_count": null_cnt,
                "null_percentage": round((null_cnt / total_rows) * 100, 2),
                "data_type": str(df[col].dtype)
            }

    completeness_score = round(((total_cells - total_missing_cells) / total_cells) * 100, 2) if total_cells > 0 else 100.0
    
    # Sort columns by most missing
    sorted_cols = sorted(missing_by_col.items(), key=lambda x: x[1]["null_count"], reverse=True)

    return {
        "dataset_name": dataset.original_filename,
        "total_rows": total_rows,
        "total_columns": len(df.columns),
        "total_missing_cells": total_missing_cells,
        "overall_completeness_percentage": completeness_score,
        "columns_with_missing_values": dict(sorted_cols),
        "columns_with_missing_count": len(missing_by_col)
    }


# Tool 8: analyze_categories
def analyze_categories(
    dataset_id: str,
    db: Session,
    user_id: str,
    column: str,
    top_n: int = 10
) -> Dict[str, Any]:
    dataset, version, df = _load_dataset_dataframe(dataset_id, db, user_id)
    if column not in df.columns:
        raise ValueError(f"Column '{column}' not found in dataset. Available: {list(df.columns)}")

    s = df[column]
    total = len(s.dropna())
    val_counts = s.value_counts(dropna=True).head(top_n)
    
    items = []
    for val, count in val_counts.items():
        items.append({
            "category": str(val),
            "count": count,
            "percentage": round((count / total) * 100, 2) if total > 0 else 0
        })

    return {
        "dataset_name": dataset.original_filename,
        "column": column,
        "unique_count": s.nunique(dropna=True),
        "null_count": s.isnull().sum(),
        "top_categories": items,
        "mode": str(s.mode().iloc[0]) if not s.mode().empty else None
    }


# Tool 9: analyze_trends
def analyze_trends(
    dataset_id: str,
    db: Session,
    user_id: str,
    x_column: str,
    y_column: str
) -> Dict[str, Any]:
    dataset, version, df = _load_dataset_dataframe(dataset_id, db, user_id)
    if x_column not in df.columns or y_column not in df.columns:
        raise ValueError(f"Columns '{x_column}' or '{y_column}' not found in dataset.")

    y_num = pd.to_numeric(df[y_column], errors="coerce")
    valid_mask = y_num.notna() & df[x_column].notna()
    work = df[valid_mask].copy()
    work["_y"] = y_num[valid_mask]

    grouped = work.groupby(x_column)["_y"].mean().reset_index()
    try:
        grouped["_sort"] = pd.to_datetime(grouped[x_column])
        grouped = grouped.sort_values(by="_sort")
    except Exception:
        try:
            grouped["_sort"] = pd.to_numeric(grouped[x_column])
            grouped = grouped.sort_values(by="_sort")
        except Exception:
            grouped = grouped.sort_values(by=x_column)

    y_vals = grouped["_y"].tolist()
    if len(y_vals) >= 2:
        start_val = float(y_vals[0])
        end_val = float(y_vals[-1])
        change_pct = round(((end_val - start_val) / abs(start_val) * 100), 2) if start_val != 0 else 0.0
        direction = "upward" if change_pct > 1 else ("downward" if change_pct < -1 else "stable")
    else:
        start_val = y_vals[0] if y_vals else 0
        end_val = start_val
        change_pct = 0.0
        direction = "insufficient_points"

    return {
        "dataset_name": dataset.original_filename,
        "x_column": x_column,
        "y_column": y_column,
        "point_count": len(grouped),
        "initial_value": round(float(start_val), 2),
        "final_value": round(float(end_val), 2),
        "overall_change_percent": change_pct,
        "trend_direction": direction,
        "min_value": round(float(min(y_vals)), 2) if y_vals else 0,
        "max_value": round(float(max(y_vals)), 2) if y_vals else 0
    }


# Tool 10: generate_chart
def generate_chart(
    dataset_id: str,
    db: Session,
    user_id: str,
    chart_type: str = "bar_vertical",
    x_column: Optional[str] = None,
    y_column: Optional[str] = None,
    aggregation: Optional[str] = "sum",
    group_by: Optional[str] = None,
    bins: Optional[int] = 15,
    selected_columns: Optional[List[str]] = None
) -> Dict[str, Any]:
    dataset, version, df = _load_dataset_dataframe(dataset_id, db, user_id)
    
    # Auto-resolve columns if not provided
    if chart_type in ["heatmap", "correlation_heatmap"]:
        chart_type = "heatmap"
    elif not x_column:
        num_cols = list(df.select_dtypes(include="number").columns)
        cat_cols = list(df.select_dtypes(include=cast(Any, ["object", "category"])).columns)
        if chart_type in ["histogram", "box"]:
            x_column = num_cols[0] if num_cols else df.columns[0]
        elif chart_type in ["pie", "donut"]:
            x_column = cat_cols[0] if cat_cols else df.columns[0]
        else: # bar or line
            x_column = cat_cols[0] if cat_cols else (df.columns[0])
            if not y_column and num_cols:
                y_column = num_cols[0]

    payload = generate_chart_payload(
        df=df,
        chart_type=chart_type,
        x_column=x_column,
        y_column=y_column,
        group_by=group_by,
        aggregation=aggregation,
        bins=bins,
        selected_columns=selected_columns
    )

    return {
        "dataset_name": dataset.original_filename,
        "chart_payload": payload
    }


# Tool 11: generate_report
def generate_report(
    dataset_id: str,
    db: Session,
    user_id: str,
    options: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    dataset, version, df = _load_dataset_dataframe(dataset_id, db, user_id)
    opts = options or {}
    
    report_data = analyze_dataset_for_report(
        df=df,
        dataset_name=dataset.original_filename,
        version_num=version.version_number,
        config=opts
    )


    return {
        "dataset_name": dataset.original_filename,
        "report_id": f"rep_{dataset.id[:8]}",
        "title": report_data.get("metadata", {}).get("title"),
        "executive_summary": report_data.get("executive_summary", ""),
        "quality_score": report_data.get("quality_score", {}),
        "key_findings": report_data.get("key_findings", []),
        "strategic_recommendations": report_data.get("strategic_recommendations", []),
        "structure": report_data
    }


# Tool 12: generate_pdf
def generate_pdf(
    dataset_id: str,
    db: Session,
    user_id: str,
    chart_config: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    dataset, version, df = _load_dataset_dataframe(dataset_id, db, user_id)

    quality = db.query(QualityScore).filter(QualityScore.dataset_version_id == version.id).first()
    profile = db.query(DataProfile).filter(DataProfile.dataset_version_id == version.id).first()
    patterns = db.query(PatternResult).filter(PatternResult.dataset_version_id == version.id).all()
    insights = db.query(Insight).filter(Insight.dataset_version_id == version.id).all()
    cleaning_ops = db.query(CleaningOperation).filter(CleaningOperation.dataset_id == dataset_id).all()

    qual_dict = {
        "overall_score": quality.overall_score if quality else 95.0,
        "completeness_score": quality.completeness_score if quality else 100.0,
        "uniqueness_score": quality.uniqueness_score if quality else 100.0,
        "detected_issues": quality.detected_issues if quality else {}
    }
    summary_stats = dict(profile.numeric_summary) if (profile and profile.numeric_summary) else {}
    pat_list = [
        {"pattern_type": p.pattern_type, "explanation": p.explanation, "evidence": p.evidence, "statistical_metrics": p.statistical_metrics}
        for p in patterns
    ]
    ins_list = [
        {"insight_type": i.insight_type, "title": i.title, "description": i.description, "ai_interpretation": i.ai_interpretation, "confidence_score": i.confidence_score}
        for i in insights
    ]
    clean_list = [
        {"operation_type": c.operation_type, "parameters": c.parameters, "affected_rows_count": c.affected_rows_count}
        for c in cleaning_ops
    ]

    pdf_bytes = generate_executive_pdf_report(
        dataset_name=dataset.original_filename,
        row_count=version.row_count,
        col_count=version.column_count,
        quality_score=qual_dict,
        summary_stats=summary_stats,
        patterns=pat_list,
        insights=ins_list,
        df=df,
        cleaning_ops=clean_list,
        chart_config=chart_config
    )

    os.makedirs("./reports", exist_ok=True)
    pdf_path = f"./reports/{dataset_id}_executive_report.pdf"
    with open(pdf_path, "wb") as f:
        f.write(pdf_bytes)

    report_record = Report(
        user_id=user_id,
        dataset_version_id=version.id,
        title=f"Executive Intelligence Report - {dataset.original_filename}",
        file_format="pdf",
        storage_path=pdf_path,
        summary_data={
            "executive_summary": "Automated Multi-Page PDF Executive Intelligence Report",
            "pdf_generated": True,
            "overall_score": qual_dict["overall_score"]
        }
    )
    db.add(report_record)
    db.commit()
    db.refresh(report_record)

    download_url = f"/api/v1/reports/{dataset_id}/download_pdf"
    return {
        "dataset_name": dataset.original_filename,
        "report_id": report_record.id,
        "filename": f"{dataset.original_filename}_report.pdf",
        "file_size_bytes": len(pdf_bytes),
        "download_url": download_url,
        "storage_path": pdf_path,
        "status": "Ready"
    }


# Tool 13: get_report_status
def get_report_status(dataset_id: str, db: Session, user_id: str) -> Dict[str, Any]:
    dataset, version = _get_dataset_and_version(dataset_id, db, user_id)
    reports = db.query(Report).filter(
        Report.dataset_version_id == version.id,
        Report.user_id == user_id
    ).order_by(Report.created_at.desc()).all()

    report_items = []
    for r in reports:
        report_items.append({
            "report_id": r.id,
            "title": r.title,
            "file_format": r.file_format,
            "created_at": str(r.created_at),
            "download_url": f"/api/v1/reports/{dataset_id}/download_pdf"
        })

    return {
        "dataset_name": dataset.original_filename,
        "total_reports": len(reports),
        "reports": report_items,
        "latest_download_url": f"/api/v1/reports/{dataset_id}/download_pdf" if reports else None
    }


# Tool 14: get_previous_analysis
def get_previous_analysis(dataset_id: str, db: Session, user_id: str) -> Dict[str, Any]:
    dataset, version = _get_dataset_and_version(dataset_id, db, user_id)
    quality = db.query(QualityScore).filter(QualityScore.dataset_version_id == version.id).first()
    patterns = db.query(PatternResult).filter(PatternResult.dataset_version_id == version.id).all()
    insights = db.query(Insight).filter(Insight.dataset_version_id == version.id).all()

    return {
        "dataset_name": dataset.original_filename,
        "version_number": version.version_number,
        "quality_score": {
            "overall_score": quality.overall_score if quality else None,
            "completeness_score": quality.completeness_score if quality else None,
            "uniqueness_score": quality.uniqueness_score if quality else None,
            "detected_issues": quality.detected_issues if quality else {}
        },
        "patterns": [
            {"type": p.pattern_type, "explanation": p.explanation, "metrics": p.statistical_metrics}
            for p in patterns
        ],
        "insights": [
            {"type": i.insight_type, "title": i.title, "description": i.description, "confidence": i.confidence_score}
            for i in insights
        ]
    }


# Tool 15: get_project_context
def get_project_context(project_id: str, db: Session, user_id: str) -> Dict[str, Any]:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise ValueError(f"Project '{project_id}' not found.")
    if project.user_id != user_id:
        raise PermissionError("You do not have permission to access this project.")

    datasets = db.query(Dataset).filter(Dataset.project_id == project_id).all()
    dataset_list = []
    for d in datasets:
        v = db.query(DatasetVersion).filter(
            DatasetVersion.dataset_id == d.id,
            DatasetVersion.version_number == d.current_version_num
        ).first()
        dataset_list.append({
            "id": d.id,
            "filename": d.original_filename,
            "version": d.current_version_num,
            "row_count": v.row_count if v else 0,
            "column_count": v.column_count if v else 0,
            "file_type": d.file_type
        })

    return {
        "project_id": project.id,
        "name": project.name,
        "description": project.description,
        "dataset_count": len(datasets),
        "datasets": dataset_list
    }
