from fastapi import APIRouter
from app.schemas.common import ApiResponse
from app.schemas.report import ReportGenerateRequest, ReportResponse

router = APIRouter()

@router.post("/generate", response_model=ApiResponse[ReportResponse])
def generate_report(report_in: ReportGenerateRequest):
    return {
        "success": True,
        "data": {
            "id": "rep-999",
            "dataset_version_id": report_in.dataset_version_id,
            "user_id": "demo-user-id",
            "title": report_in.title,
            "file_format": report_in.file_format,
            "storage_path": f"./storage/reports/report_{report_in.dataset_version_id}.{report_in.file_format}",
            "summary_data": {"sections": 5, "charts": 3, "generated_by": "Aether Copilot AI Engine"},
            "created_at": "2026-08-22T00:00:00Z"
        },
        "error": None
    }
