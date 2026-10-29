from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.dataset import Dataset, DatasetVersion
from app.models.analytics import PatternResult
from app.schemas.common import ApiResponse
from app.schemas.analytics import PatternResponse
from app.data_processing.loader import load_dataframe
from app.pattern_discovery.detector import detect_correlations, detect_anomalies, detect_clusters

router = APIRouter()

@router.get("/{dataset_id}", response_model=ApiResponse[List[PatternResponse]])
def get_patterns(
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

    patterns = db.query(PatternResult).filter(PatternResult.dataset_version_id == version.id).all()
    if not patterns:
        df = load_dataframe(version.storage_path, dataset.file_type)
        corr_patterns = detect_correlations(df)
        anom_patterns = detect_anomalies(df)
        clust_patterns = detect_clusters(df)
        
        all_detected = corr_patterns + anom_patterns + clust_patterns
        
        patterns = []
        for p in all_detected:
            p_res = PatternResult(
                dataset_version_id=version.id,
                pattern_type=p["pattern_type"],
                variables=p["variables"],
                statistical_metrics=p["statistical_metrics"],
                evidence=p["evidence"],
                explanation=p["explanation"]
            )
            db.add(p_res)
            patterns.append(p_res)
            
        db.commit()
        for p in patterns:
            db.refresh(p)

    return {
        "success": True,
        "data": patterns,
        "error": None
    }
