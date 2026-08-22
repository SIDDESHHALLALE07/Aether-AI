from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

class DatasetBase(BaseModel):
    original_filename: str
    file_type: str

class DatasetResponse(DatasetBase):
    id: str
    project_id: str
    user_id: str
    file_size_bytes: int
    current_version_num: int
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class DatasetVersionResponse(BaseModel):
    id: str
    dataset_id: str
    version_number: int
    row_count: int
    column_count: int
    columns_meta: Dict[str, Any]
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class DataProfileResponse(BaseModel):
    id: str
    dataset_version_id: str
    numeric_summary: Optional[Dict[str, Any]] = None
    categorical_summary: Optional[Dict[str, Any]] = None
    datetime_summary: Optional[Dict[str, Any]] = None
    data_types: Dict[str, Any]
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class QualityScoreResponse(BaseModel):
    id: str
    dataset_version_id: str
    overall_score: float
    completeness_score: float
    uniqueness_score: float
    validity_score: float
    consistency_score: float
    detected_issues: Dict[str, Any]
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
