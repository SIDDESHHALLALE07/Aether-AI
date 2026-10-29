import os
import json
import logging
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.models.project import Project
from app.models.dataset import Dataset, DatasetVersion
from app.schemas.common import ApiResponse
from app.schemas.dataset import DatasetResponse, DatasetVersionResponse, DataProfileResponse, QualityScoreResponse
from app.services.storage import storage_service
from app.data_processing.loader import load_dataframe, extract_metadata

router = APIRouter()

@router.get("", response_model=ApiResponse[List[DatasetResponse]], include_in_schema=False)
@router.get("/", response_model=ApiResponse[List[DatasetResponse]])
def list_datasets(
    project_id: str,
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id).first()
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
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    ext = os.path.splitext(file.filename or "")[1].lower().lstrip(".")
    if ext not in ["csv", "xlsx", "xls", "json"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid file format. Supported formats are CSV, Excel (.xlsx, .xls), and JSON (.json)."
        )

    # Save to storage driver
    storage_path, file_size = storage_service.save_file(file, subfolder="raw")

    if file_size == 0:
        if os.path.exists(storage_path):
            try:
                os.remove(storage_path)
            except Exception:
                pass
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty (0 bytes)."
        )

    # Load DataFrame & Extract metadata with cleanup on failure
    try:
        df = load_dataframe(storage_path, ext)
        row_count, col_count, columns_meta = extract_metadata(df)
    except HTTPException:
        if os.path.exists(storage_path):
            try:
                os.remove(storage_path)
            except Exception:
                pass
        raise
    except Exception as e:
        if os.path.exists(storage_path):
            try:
                os.remove(storage_path)
            except Exception:
                pass
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Failed to parse dataset file. The file content could not be processed."
        )

    # Create Dataset Record
    dataset = Dataset(
        project_id=project_id,
        user_id="default-user",
        original_filename=file.filename or f"dataset.{ext}",
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
    db.refresh(version_1)

    # Run automated profiling pipeline immediately upon upload
    try:
        from app.data_processing.profiler import profile_dataset
        from app.data_processing.quality import calculate_quality_score
        from app.models.profile import DataProfile, QualityScore

        num_sum, cat_sum, dt_sum, dtypes = profile_dataset(df)
        profile = DataProfile(
            dataset_version_id=version_1.id,
            numeric_summary=num_sum,
            categorical_summary=cat_sum,
            datetime_summary=dt_sum,
            data_types=dtypes
        )
        db.add(profile)

        overall, comp, uniq, val, cons, issues = calculate_quality_score(df)
        quality = QualityScore(
            dataset_version_id=version_1.id,
            overall_score=overall,
            completeness_score=comp,
            uniqueness_score=uniq,
            validity_score=val,
            consistency_score=cons,
            detected_issues=issues
        )
        db.add(quality)
        db.commit()
    except Exception as profile_err:
        # Logging failure without blocking upload completion
        logger = logging.getLogger("uvicorn.error")
        logger.error(f"Automated initial profiling encountered error: {profile_err}")

    return {
        "success": True,
        "data": dataset,
        "error": None
    }

@router.get("/{dataset_id}", response_model=ApiResponse[dict])
def get_dataset_detail(
    dataset_id: str,
    db: Session = Depends(get_db)
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
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
    db: Session = Depends(get_db)
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
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

@router.get("/{dataset_id}/profile", response_model=ApiResponse[DataProfileResponse])
def get_dataset_profile(
    dataset_id: str,
    db: Session = Depends(get_db)
):
    from app.data_processing.profiler import profile_dataset
    from app.models.profile import DataProfile
    
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    version = db.query(DatasetVersion).filter(
        DatasetVersion.dataset_id == dataset_id,
        DatasetVersion.version_number == dataset.current_version_num
    ).first()
    if not version:
        raise HTTPException(status_code=404, detail="Dataset version not found")

    profile = db.query(DataProfile).filter(DataProfile.dataset_version_id == version.id).first()
    if not profile:
        df = load_dataframe(version.storage_path, dataset.file_type)
        num_sum, cat_sum, dt_sum, dtypes = profile_dataset(df)
        
        profile = DataProfile(
            dataset_version_id=version.id,
            numeric_summary=num_sum,
            categorical_summary=cat_sum,
            datetime_summary=dt_sum,
            data_types=dtypes
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)

    return {
        "success": True,
        "data": profile,
        "error": None
    }

@router.get("/{dataset_id}/quality", response_model=ApiResponse[QualityScoreResponse])
def get_dataset_quality(
    dataset_id: str,
    db: Session = Depends(get_db)
):
    from app.data_processing.quality import calculate_quality_score
    from app.models.profile import QualityScore

    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    version = db.query(DatasetVersion).filter(
        DatasetVersion.dataset_id == dataset_id,
        DatasetVersion.version_number == dataset.current_version_num
    ).first()
    if not version:
        raise HTTPException(status_code=404, detail="Dataset version not found")

    quality = db.query(QualityScore).filter(QualityScore.dataset_version_id == version.id).first()
    if not quality:
        df = load_dataframe(version.storage_path, dataset.file_type)
        overall, comp, uniq, val, cons, issues = calculate_quality_score(df)
        
        quality = QualityScore(
            dataset_version_id=version.id,
            overall_score=overall,
            completeness_score=comp,
            uniqueness_score=uniq,
            validity_score=val,
            consistency_score=cons,
            detected_issues=issues
        )
        db.add(quality)
        db.commit()
        db.refresh(quality)

    return {
        "success": True,
        "data": quality,
        "error": None
    }

@router.delete("/{dataset_id}", response_model=ApiResponse[dict])
def delete_dataset(
    dataset_id: str,
    db: Session = Depends(get_db)
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    # Clean up versions and raw files
    versions = db.query(DatasetVersion).filter(DatasetVersion.dataset_id == dataset_id).all()
    for v in versions:
        if v.storage_path and os.path.exists(v.storage_path):
            try:
                os.remove(v.storage_path)
            except Exception:
                pass

    db.delete(dataset)
    db.commit()

    return {
        "success": True,
        "data": {"message": "Dataset deleted successfully", "id": dataset_id},
        "error": None
    }

