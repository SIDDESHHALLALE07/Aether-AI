from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, Any
from datetime import datetime

class CleaningRequest(BaseModel):
    operation_type: str # drop_nulls | impute | remove_duplicates | cast_type | handle_outliers
    parameters: Dict[str, Any]

class CleaningResponse(BaseModel):
    id: str
    dataset_id: str
    source_version_id: str
    target_version_id: str
    operation_type: str
    parameters: Dict[str, Any]
    affected_rows_count: Optional[int] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
