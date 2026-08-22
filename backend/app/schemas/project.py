from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_archived: Optional[bool] = None

class ProjectResponse(ProjectBase):
    id: str
    user_id: str
    is_archived: bool
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class ActivityLogResponse(BaseModel):
    id: str
    project_id: str
    user_id: str
    action_type: str
    details: Optional[dict] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
