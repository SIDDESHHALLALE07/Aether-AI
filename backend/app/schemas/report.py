from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, Any
from datetime import datetime

class ReportGenerateRequest(BaseModel):
    dataset_version_id: str
    title: str
    file_format: str = "pdf" # pdf | csv | xlsx
    include_visualizations: bool = True
    include_patterns: bool = True
    include_ai_summary: bool = True

class ReportResponse(BaseModel):
    id: str
    dataset_version_id: str
    user_id: str
    title: str
    file_format: str
    storage_path: str
    summary_data: Optional[Dict[str, Any]] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
