from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.models.dataset import Dataset, DatasetVersion
from app.schemas.common import ApiResponse
from app.schemas.analytics import VisualizationRequest
from app.data_processing.loader import load_dataframe
from app.analytics.visualization import generate_chart_payload, recommend_charts

router = APIRouter()

@router.post("/{dataset_id}/chart", response_model=ApiResponse[dict])
def generate_chart_data(
    dataset_id: str,
    viz_in: VisualizationRequest,
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
    payload = generate_chart_payload(
        df=df,
        chart_type=viz_in.chart_type,
        x_column=viz_in.x_column,
        y_column=viz_in.y_column,
        group_by=viz_in.group_by,
        aggregation=viz_in.aggregation,
        bins=viz_in.bins,
        selected_columns=viz_in.selected_columns
    )

    return {
        "success": True,
        "data": payload,
        "error": None
    }

@router.get("/{dataset_id}/recommendations", response_model=ApiResponse[List[dict]])
def get_chart_recommendations(
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
    recs = recommend_charts(df)

    return {
        "success": True,
        "data": recs,
        "error": None
    }
