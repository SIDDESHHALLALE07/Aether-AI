import os
import uuid
import pandas as pd
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List

from app.core.config import settings
from app.core.database import get_db
from app.models.dataset import Dataset, DatasetVersion
from app.models.cleaning import CleaningOperation
from app.schemas.common import ApiResponse
from app.schemas.cleaning import CleaningRequest, CleaningResponse
from app.data_processing.loader import load_dataframe, extract_metadata
from app.data_processing.cleaner import apply_cleaning

router = APIRouter()

@router.post("/{dataset_id}/apply", response_model=ApiResponse[CleaningResponse])
def apply_cleaning_operation(
    dataset_id: str,
    clean_in: CleaningRequest,
    db: Session = Depends(get_db)
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    source_version = db.query(DatasetVersion).filter(
        DatasetVersion.dataset_id == dataset_id,
        DatasetVersion.version_number == dataset.current_version_num
    ).first()
    if not source_version:
        raise HTTPException(status_code=404, detail="Current dataset version not found")

    # Load source dataframe
    df = load_dataframe(source_version.storage_path, dataset.file_type)

    # Apply cleaning transformation
    cleaned_df, affected_rows = apply_cleaning(df, clean_in.operation_type, clean_in.parameters)

    # Save cleaned file to processed storage
    processed_dir = Path(settings.LOCAL_STORAGE_PATH) / "processed"
    processed_dir.mkdir(parents=True, exist_ok=True)
    
    new_version_num = dataset.current_version_num + 1
    new_file_id = str(uuid.uuid4())
    new_filename = f"{new_file_id}_v{new_version_num}_{dataset.original_filename}"
    new_storage_path = str(processed_dir / new_filename)

    if dataset.file_type.lower() == "csv":
        cleaned_df.to_csv(new_storage_path, index=False)
    else:
        cleaned_df.to_excel(new_storage_path, index=False)

    # Extract metadata for new version
    row_count, col_count, columns_meta = extract_metadata(cleaned_df)

    # Create new DatasetVersion record
    target_version = DatasetVersion(
        dataset_id=dataset_id,
        version_number=new_version_num,
        storage_path=new_storage_path,
        row_count=row_count,
        column_count=col_count,
        columns_meta=columns_meta
    )
    db.add(target_version)
    db.commit()
    db.refresh(target_version)

    # Update Dataset current version pointer
    dataset.current_version_num = new_version_num
    db.commit()

    # Log CleaningOperation record
    cleaning_op = CleaningOperation(
        dataset_id=dataset_id,
        source_version_id=source_version.id,
        target_version_id=target_version.id,
        operation_type=clean_in.operation_type,
        parameters=clean_in.parameters,
        affected_rows_count=affected_rows
    )
    db.add(cleaning_op)
    db.commit()
    db.refresh(cleaning_op)

    return {
        "success": True,
        "data": cleaning_op,
        "error": None
    }

@router.post("/{dataset_id}/rollback", response_model=ApiResponse[dict])
def rollback_dataset_version(
    dataset_id: str,
    target_version_num: int = Query(..., ge=1),
    db: Session = Depends(get_db)
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    target_version = db.query(DatasetVersion).filter(
        DatasetVersion.dataset_id == dataset_id,
        DatasetVersion.version_number == target_version_num
    ).first()
    if not target_version:
        raise HTTPException(status_code=404, detail=f"Version {target_version_num} does not exist for this dataset")

    # Non-destructive rollback: point dataset.current_version_num back to target_version_num
    dataset.current_version_num = target_version_num
    db.commit()

    return {
        "success": True,
        "data": {
            "dataset_id": dataset_id,
            "current_version_num": target_version_num,
            "message": f"Successfully rolled back dataset to Version {target_version_num}"
        },
        "error": None
    }

