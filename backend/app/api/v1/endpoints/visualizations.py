from fastapi import APIRouter
from app.schemas.common import ApiResponse
from app.schemas.analytics import VisualizationRequest

router = APIRouter()

@router.post("/{dataset_id}/chart", response_model=ApiResponse[dict])
def generate_chart_data(dataset_id: str, viz_in: VisualizationRequest):
    return {
        "success": True,
        "data": {
            "chart_type": viz_in.chart_type,
            "x_column": viz_in.x_column,
            "y_column": viz_in.y_column,
            "series": [
                {"name": "Month-to-Month", "data": [45, 62, 78, 92, 110]},
                {"name": "Two Year", "data": [12, 15, 18, 22, 25]}
            ],
            "labels": ["Q1", "Q2", "Q3", "Q4", "Q5"]
        },
        "error": None
    }
