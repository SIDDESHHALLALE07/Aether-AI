from __future__ import annotations
import uuid
from sqlalchemy import String, Float, ForeignKey, JSON, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from typing import Optional, TYPE_CHECKING
from app.core.base import Base

if TYPE_CHECKING:
    from app.models.dataset import DatasetVersion

def generate_uuid():
    return str(uuid.uuid4())

class DataProfile(Base):
    __tablename__ = "data_profiles"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    dataset_version_id: Mapped[str] = mapped_column(String(36), ForeignKey("dataset_versions.id", ondelete="CASCADE"), nullable=False, index=True)
    numeric_summary: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    categorical_summary: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    datetime_summary: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    data_types: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    version: Mapped["DatasetVersion"] = relationship("DatasetVersion", back_populates="profile")

class QualityScore(Base):
    __tablename__ = "quality_scores"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    dataset_version_id: Mapped[str] = mapped_column(String(36), ForeignKey("dataset_versions.id", ondelete="CASCADE"), nullable=False, index=True)
    overall_score: Mapped[float] = mapped_column(Float, nullable=False)
    completeness_score: Mapped[float] = mapped_column(Float, nullable=False)
    uniqueness_score: Mapped[float] = mapped_column(Float, nullable=False)
    validity_score: Mapped[float] = mapped_column(Float, nullable=False)
    consistency_score: Mapped[float] = mapped_column(Float, nullable=False)
    detected_issues: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    version: Mapped["DatasetVersion"] = relationship("DatasetVersion", back_populates="quality_score")
