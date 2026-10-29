from __future__ import annotations
import uuid
from sqlalchemy import String, ForeignKey, JSON, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from typing import Optional, TYPE_CHECKING
from app.core.base import Base

if TYPE_CHECKING:
    from app.models.dataset import DatasetVersion

def generate_uuid():
    return str(uuid.uuid4())

class Report(Base):
    __tablename__ = "reports"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    dataset_version_id: Mapped[str] = mapped_column(String(36), ForeignKey("dataset_versions.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, default="default-user", index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    file_format: Mapped[str] = mapped_column(String(20), nullable=False) # pdf | csv | xlsx | html
    storage_path: Mapped[str] = mapped_column(String(512), nullable=False)
    summary_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    version: Mapped["DatasetVersion"] = relationship("DatasetVersion", back_populates="reports")
