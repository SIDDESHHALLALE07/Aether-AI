from fastapi import APIRouter, UploadFile, File, Form
from typing import List
from app.schemas.common import ApiResponse
from app.schemas.dataset import DatasetResponse, DataProfileResponse, QualityScoreResponse

router = APIRouter()

@router.get("/", response_model=ApiResponse[List[DatasetResponse]])
def list_datasets(project_id: str):
    return {
        "success": True,
        "data": [
            {
                "id": "ds-123",
                "project_id": project_id,
                "user_id": "demo-user-id",
                "original_filename": "customer_churn.csv",
                "file_type": "csv",
                "file_size_bytes": 1048576,
                "current_version_num": 1,
                "created_at": "2026-08-22T00:00:00Z",
                "updated_at": "2026-08-22T00:00:00Z"
            }
        ],
        "error": None
    }

@router.post("/upload", response_model=ApiResponse[DatasetResponse])
def upload_dataset(project_id: str = Form(...), file: UploadFile = File(...)):
    return {
        "success": True,
        "data": {
            "id": "ds-uploaded-999",
            "project_id": project_id,
            "user_id": "demo-user-id",
            "original_filename": file.filename or "dataset.csv",
            "file_type": "csv",
            "file_size_bytes": 2048576,
            "current_version_num": 1,
            "created_at": "2026-08-22T00:00:00Z",
            "updated_at": "2026-08-22T00:00:00Z"
        },
        "error": None
    }

@router.get("/{dataset_id}/profile", response_model=ApiResponse[DataProfileResponse])
def get_dataset_profile(dataset_id: str):
    return {
        "success": True,
        "data": {
            "id": "prof-123",
            "dataset_version_id": "ver-1",
            "numeric_summary": {
                "monthly_charges": {"min": 18.25, "mean": 64.76, "max": 118.75, "std": 30.09}
            },
            "categorical_summary": {
                "contract_type": {"Month-to-month": 3875, "Two year": 1695, "One year": 1473}
            },
            "datetime_summary": None,
            "data_types": {"customer_id": "string", "monthly_charges": "float64", "churn": "integer"},
            "created_at": "2026-08-22T00:00:00Z"
        },
        "error": None
    }

@router.get("/{dataset_id}/quality", response_model=ApiResponse[QualityScoreResponse])
def get_dataset_quality(dataset_id: str):
    return {
        "success": True,
        "data": {
            "id": "qual-123",
            "dataset_version_id": "ver-1",
            "overall_score": 94.2,
            "completeness_score": 98.5,
            "uniqueness_score": 99.1,
            "validity_score": 92.0,
            "consistency_score": 91.8,
            "detected_issues": {"missing_values": 45, "duplicate_rows": 0, "type_mismatches": 2},
            "created_at": "2026-08-22T00:00:00Z"
        },
        "error": None
    }
