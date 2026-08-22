from pydantic import BaseModel
from typing import Generic, TypeVar, Optional, Any

T = TypeVar("T")

class ErrorDetail(BaseModel):
    code: str
    message: str

class ApiResponse(BaseModel, Generic[T]):
    success: bool = True
    data: Optional[T] = None
    error: Optional[ErrorDetail] = None

class HealthResponse(BaseModel):
    status: str = "healthy"
    service: str = "Aether Copilot AI"
    version: str = "1.0.0"
    environment: str
