from __future__ import annotations
import uuid
from sqlalchemy import String, Text, Float, ForeignKey, JSON, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from typing import Optional, TYPE_CHECKING
from app.core.base import Base

if TYPE_CHECKING:
    from app.models.dataset import DatasetVersion

def generate_uuid():
    return str(uuid.uuid4())

class PatternResult(Base):
    __tablename__ = "pattern_results"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    dataset_version_id: Mapped[str] = mapped_column(String(36), ForeignKey("dataset_versions.id", ondelete="CASCADE"), nullable=False, index=True)
    pattern_type: Mapped[str] = mapped_column(String(100), nullable=False)
    variables: Mapped[dict] = mapped_column(JSON, nullable=False)
    statistical_metrics: Mapped[dict] = mapped_column(JSON, nullable=False)
    evidence: Mapped[dict] = mapped_column(JSON, nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    version: Mapped["DatasetVersion"] = relationship("DatasetVersion", back_populates="patterns")

class Insight(Base):
    __tablename__ = "insights"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    dataset_version_id: Mapped[str] = mapped_column(String(36), ForeignKey("dataset_versions.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    insight_type: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    computed_evidence: Mapped[dict] = mapped_column(JSON, nullable=False)
    ai_interpretation: Mapped[str] = mapped_column(Text, nullable=False)
    confidence_score: Mapped[float] = mapped_column(Float, default=1.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    version: Mapped["DatasetVersion"] = relationship("DatasetVersion", back_populates="insights")
