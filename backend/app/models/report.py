import uuid
from sqlalchemy import String, ForeignKey, JSON, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime
from typing import Optional
from app.core.base import Base

def generate_uuid():
    return str(uuid.uuid4())

class Report(Base):
    __tablename__ = "reports"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    dataset_version_id: Mapped[str] = mapped_column(String(36), ForeignKey("dataset_versions.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    file_format: Mapped[str] = mapped_column(String(20), nullable=False) # pdf | csv | xlsx
    storage_path: Mapped[str] = mapped_column(String(512), nullable=False)
    summary_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
