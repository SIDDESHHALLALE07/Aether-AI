from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.models.dataset import Dataset, DatasetVersion
from app.schemas.common import ApiResponse
from app.data_processing.loader import load_dataframe
from app.analytics.engine import (
    compute_summary_statistics,
    compute_group_by_aggregation,
    compute_correlation_matrix,
    compute_distribution
)

router = APIRouter()

class GroupByRequest(BaseModel):
    group_by_column: str
    target_column: str
    aggregation_func: str = "mean"

@router.get("/{dataset_id}/summary", response_model=ApiResponse[dict])
def get_analytics_summary(
    dataset_id: str,
    db: Session = Depends(get_db)
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    version = db.query(DatasetVersion).filter(
        DatasetVersion.dataset_id == dataset_id,
        DatasetVersion.version_number == dataset.current_version_num
    ).first()
    if not version:
        raise HTTPException(status_code=404, detail="Dataset version not found")

    df = load_dataframe(version.storage_path, dataset.file_type)
    stats = compute_summary_statistics(df)

    return {
        "success": True,
        "data": {
            "dataset_id": dataset_id,
            "version_number": dataset.current_version_num,
            "total_rows": len(df),
            "total_columns": len(df.columns),
            "summary_statistics": stats
        },
        "error": None
    }

@router.post("/{dataset_id}/group_by", response_model=ApiResponse[List[dict]])
def get_group_by_analytics(
    dataset_id: str,
    group_in: GroupByRequest,
    db: Session = Depends(get_db)
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    version = db.query(DatasetVersion).filter(
        DatasetVersion.dataset_id == dataset_id,
        DatasetVersion.version_number == dataset.current_version_num
    ).first()
    if not version:
        raise HTTPException(status_code=404, detail="Dataset version not found")

    df = load_dataframe(version.storage_path, dataset.file_type)
    res = compute_group_by_aggregation(df, group_in.group_by_column, group_in.target_column, group_in.aggregation_func)

    return {
        "success": True,
        "data": res,
        "error": None
    }

@router.get("/{dataset_id}/correlation", response_model=ApiResponse[dict])
def get_correlation_matrix(
    dataset_id: str,
    method: str = Query("pearson", pattern="^(pearson|spearman)$"),
    db: Session = Depends(get_db)
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    version = db.query(DatasetVersion).filter(
        DatasetVersion.dataset_id == dataset_id,
        DatasetVersion.version_number == dataset.current_version_num
    ).first()
    if not version:
        raise HTTPException(status_code=404, detail="Dataset version not found")

    df = load_dataframe(version.storage_path, dataset.file_type)
    matrix = compute_correlation_matrix(df, method=method)

    return {
        "success": True,
        "data": matrix,
        "error": None
    }

@router.get("/{dataset_id}/distribution", response_model=ApiResponse[dict])
def get_column_distribution(
    dataset_id: str,
    column: str = Query(...),
    db: Session = Depends(get_db)
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    version = db.query(DatasetVersion).filter(
        DatasetVersion.dataset_id == dataset_id,
        DatasetVersion.version_number == dataset.current_version_num
    ).first()
    if not version:
        raise HTTPException(status_code=404, detail="Dataset version not found")

    df = load_dataframe(version.storage_path, dataset.file_type)
    dist = compute_distribution(df, column=column)

    return {
        "success": True,
        "data": dist,
        "error": None
    }
