from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, Any, List
from datetime import datetime

class ChatRequest(BaseModel):
    message: str
    dataset_id: Optional[str] = None
    project_id: Optional[str] = None
    conversation_id: Optional[str] = None

class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    sender: str
    content: str
    evidence: Optional[Dict[str, Any]] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class ConversationSummaryResponse(BaseModel):
    id: str
    user_id: str
    dataset_id: Optional[str] = None
    project_id: Optional[str] = None
    dataset_name: Optional[str] = None
    title: Optional[str] = None
    last_message: Optional[str] = None
    message_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ConversationResponse(BaseModel):
    id: str
    user_id: str
    dataset_id: Optional[str] = None
    project_id: Optional[str] = None
    title: Optional[str] = None
    messages: List[MessageResponse] = []
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class ConversationCreate(BaseModel):
    title: Optional[str] = None
    dataset_id: Optional[str] = None
    project_id: Optional[str] = None

class ConversationUpdate(BaseModel):
    title: str
