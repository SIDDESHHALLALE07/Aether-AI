from fastapi import APIRouter
from typing import List
from app.schemas.common import ApiResponse
from app.schemas.analytics import InsightResponse

router = APIRouter()

@router.get("/{dataset_id}", response_model=ApiResponse[List[InsightResponse]])
def get_insights(dataset_id: str):
    return {
        "success": True,
        "data": [
            {
                "id": "ins-1",
                "dataset_version_id": "ver-1",
                "title": "High Month-to-Month Contract Churn Risk",
                "insight_type": "risk_factor",
                "description": "Users on Month-to-Month contracts exhibit a 42.7% churn rate, compared to 2.8% for Two-Year contracts.",
                "computed_evidence": {"month_to_month_churn": 0.427, "two_year_churn": 0.028},
                "ai_interpretation": "Transitioning month-to-month subscribers to annual plans with promotional discounts could reduce overall churn by up to 35%.",
                "confidence_score": 0.96,
                "created_at": "2026-08-22T00:00:00Z"
            }
        ],
        "error": None
    }
