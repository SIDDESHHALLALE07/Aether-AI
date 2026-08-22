from fastapi import APIRouter
from app.schemas.common import ApiResponse

router = APIRouter()

@router.get("/{dataset_id}/summary", response_model=ApiResponse[dict])
def get_analytics_summary(dataset_id: str):
    return {
        "success": True,
        "data": {
            "dataset_id": dataset_id,
            "total_rows": 7043,
            "total_columns": 21,
            "numeric_column_count": 8,
            "categorical_column_count": 13,
            "memory_usage_mb": 1.2
        },
        "error": None
    }
