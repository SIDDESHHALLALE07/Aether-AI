from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, Any, List
from datetime import datetime

class ChatRequest(BaseModel):
    dataset_id: str
    message: str

class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    sender: str
    content: str
    evidence: Optional[Dict[str, Any]] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class ConversationResponse(BaseModel):
    id: str
    dataset_id: str
    user_id: str
    title: Optional[str] = None
    messages: List[MessageResponse] = []
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
