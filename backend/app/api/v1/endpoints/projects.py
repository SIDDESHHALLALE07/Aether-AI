from fastapi import APIRouter
from typing import List
from app.schemas.common import ApiResponse
from app.schemas.project import ProjectCreate, ProjectResponse, ActivityLogResponse

router = APIRouter()

@router.get("/", response_model=ApiResponse[List[ProjectResponse]])
def list_projects():
    return {
        "success": True,
        "data": [
            {
                "id": "proj-1",
                "user_id": "demo-user-id",
                "name": "Customer Churn Analysis 2026",
                "description": "Predictive analytics and pattern discovery on telecom user behavior.",
                "is_archived": False,
                "created_at": "2026-08-22T00:00:00Z",
                "updated_at": "2026-08-22T00:00:00Z"
            }
        ],
        "error": None
    }

@router.post("/", response_model=ApiResponse[ProjectResponse])
def create_project(project_in: ProjectCreate):
    return {
        "success": True,
        "data": {
            "id": "proj-new-123",
            "user_id": "demo-user-id",
            "name": project_in.name,
            "description": project_in.description,
            "is_archived": False,
            "created_at": "2026-08-22T00:00:00Z",
            "updated_at": "2026-08-22T00:00:00Z"
        },
        "error": None
    }

@router.get("/{project_id}/activity", response_model=ApiResponse[List[ActivityLogResponse]])
def get_project_activity(project_id: str):
    return {
        "success": True,
        "data": [
            {
                "id": "act-1",
                "project_id": project_id,
                "user_id": "demo-user-id",
                "action_type": "DATASET_UPLOAD",
                "details": {"filename": "churn_dataset.csv"},
                "created_at": "2026-08-22T00:00:00Z"
            }
        ],
        "error": None
    }
