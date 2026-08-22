from fastapi import APIRouter
from app.schemas.common import ApiResponse
from app.schemas.cleaning import CleaningRequest, CleaningResponse

router = APIRouter()

@router.post("/{dataset_id}/apply", response_model=ApiResponse[CleaningResponse])
def apply_cleaning_operation(dataset_id: str, clean_in: CleaningRequest):
    return {
        "success": True,
        "data": {
            "id": "clean-op-101",
            "dataset_id": dataset_id,
            "source_version_id": "ver-1",
            "target_version_id": "ver-2",
            "operation_type": clean_in.operation_type,
            "parameters": clean_in.parameters,
            "affected_rows_count": 45,
            "created_at": "2026-08-22T00:00:00Z"
        },
        "error": None
    }
