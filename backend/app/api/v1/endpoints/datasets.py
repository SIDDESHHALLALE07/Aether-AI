import os
import json
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.dataset import Dataset, DatasetVersion
from app.schemas.common import ApiResponse
from app.schemas.dataset import DatasetResponse, DatasetVersionResponse, DataProfileResponse, QualityScoreResponse
from app.services.storage import storage_service
from app.data_processing.loader import load_dataframe, extract_metadata

router = APIRouter()

@router.get("/", response_model=ApiResponse[List[DatasetResponse]])
def list_datasets(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    datasets = db.query(Dataset).filter(Dataset.project_id == project_id).all()
    return {
        "success": True,
        "data": datasets,
        "error": None
    }

@router.post("/upload", response_model=ApiResponse[DatasetResponse])
def upload_dataset(
    project_id: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    ext = os.path.splitext(file.filename or "")[1].lower().lstrip(".")
    if ext not in ["csv", "xlsx", "xls"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid file format. Only CSV and Excel files (.csv, .xlsx, .xls) are allowed."
        )

    # Save to storage driver
    storage_path, file_size = storage_service.save_file(file, subfolder="raw")

    # Load DataFrame & Extract metadata
    df = load_dataframe(storage_path, ext)
    row_count, col_count, columns_meta = extract_metadata(df)

    # Create Dataset Record
    dataset = Dataset(
        project_id=project_id,
        user_id=current_user.id,
        original_filename=file.filename or "dataset.csv",
        storage_path=storage_path,
        file_type=ext,
        file_size_bytes=file_size,
        current_version_num=1
    )
    db.add(dataset)
    db.commit()
    db.refresh(dataset)

    # Create Dataset Version 1 Record
    version_1 = DatasetVersion(
        dataset_id=dataset.id,
        version_number=1,
        storage_path=storage_path,
        row_count=row_count,
        column_count=col_count,
        columns_meta=columns_meta
    )
    db.add(version_1)
    db.commit()

    return {
        "success": True,
        "data": dataset,
        "error": None
    }

@router.get("/{dataset_id}", response_model=ApiResponse[dict])
def get_dataset_detail(
    dataset_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.user_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    versions = db.query(DatasetVersion).filter(DatasetVersion.dataset_id == dataset_id).order_by(DatasetVersion.version_number.desc()).all()
    latest_version = versions[0] if versions else None

    return {
        "success": True,
        "data": {
            "dataset": DatasetResponse.model_validate(dataset),
            "versions": [DatasetVersionResponse.model_validate(v) for v in versions],
            "latest_version": DatasetVersionResponse.model_validate(latest_version) if latest_version else None
        },
        "error": None
    }

@router.get("/{dataset_id}/preview", response_model=ApiResponse[dict])
def get_dataset_preview(
    dataset_id: str,
    version_num: Optional[int] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.user_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    target_ver_num = version_num or dataset.current_version_num
    version = db.query(DatasetVersion).filter(
        DatasetVersion.dataset_id == dataset_id,
        DatasetVersion.version_number == target_ver_num
    ).first()
    if not version:
        raise HTTPException(status_code=404, detail=f"Dataset version {target_ver_num} not found")

    df = load_dataframe(version.storage_path, dataset.file_type)
    
    total_rows = len(df)
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    
    paged_df = df.iloc[start_idx:end_idx].fillna("")
    rows_data = paged_df.to_dict(orient="records")

    return {
        "success": True,
        "data": {
            "dataset_id": dataset_id,
            "version_number": target_ver_num,
            "total_rows": total_rows,
            "page": page,
            "limit": limit,
            "columns": list(df.columns),
            "rows": rows_data
        },
        "error": None
    }
