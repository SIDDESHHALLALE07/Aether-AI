from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.dataset import Dataset, DatasetVersion
from app.models.analytics import Insight
from app.schemas.common import ApiResponse
from app.schemas.analytics import InsightResponse
from app.data_processing.loader import load_dataframe
from app.ai.insights_generator import generate_automated_insights

router = APIRouter()

@router.get("/{dataset_id}", response_model=ApiResponse[List[InsightResponse]])
def get_insights(
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

    insights = db.query(Insight).filter(Insight.dataset_version_id == version.id).all()
    if not insights:
        df = load_dataframe(version.storage_path, dataset.file_type)
        generated_list = generate_automated_insights(df)
        
        insights = []
        for g in generated_list:
            ins = Insight(
                dataset_version_id=version.id,
                title=g["title"],
                insight_type=g["insight_type"],
                description=g["description"],
                computed_evidence=g["computed_evidence"],
                ai_interpretation=g["ai_interpretation"],
                confidence_score=g["confidence_score"]
            )
            db.add(ins)
            insights.append(ins)
            
        db.commit()
        for ins in insights:
            db.refresh(ins)

    return {
        "success": True,
        "data": insights,
        "error": None
    }
