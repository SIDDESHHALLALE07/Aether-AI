from __future__ import annotations
import uuid
from sqlalchemy import String, Integer, BigInteger, ForeignKey, JSON, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from app.core.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.user import User
    from app.models.copilot import Conversation
    from app.models.embedding import Embedding
    from app.models.cleaning import CleaningOperation
    from app.models.profile import DataProfile, QualityScore
    from app.models.analytics import PatternResult, Insight
    from app.models.report import Report

def generate_uuid():
    return str(uuid.uuid4())

class Dataset(Base, TimestampMixin):
    __tablename__ = "datasets"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, default="default-user", index=True)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_path: Mapped[str] = mapped_column(String(512), nullable=False)
    file_type: Mapped[str] = mapped_column(String(50), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    current_version_num: Mapped[int] = mapped_column(Integer, default=1)
    
    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="datasets")
    versions: Mapped[List["DatasetVersion"]] = relationship("DatasetVersion", back_populates="dataset", cascade="all, delete-orphan")
    conversations: Mapped[List["Conversation"]] = relationship("Conversation", back_populates="dataset", cascade="all, delete-orphan")
    cleaning_operations: Mapped[List["CleaningOperation"]] = relationship("CleaningOperation", back_populates="dataset", cascade="all, delete-orphan")

class DatasetVersion(Base):
    __tablename__ = "dataset_versions"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    dataset_id: Mapped[str] = mapped_column(String(36), ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    storage_path: Mapped[str] = mapped_column(String(512), nullable=False)
    row_count: Mapped[int] = mapped_column(Integer, nullable=False)
    column_count: Mapped[int] = mapped_column(Integer, nullable=False)
    columns_meta: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    dataset: Mapped["Dataset"] = relationship("Dataset", back_populates="versions")
    profile: Mapped[Optional["DataProfile"]] = relationship("DataProfile", back_populates="version", uselist=False, cascade="all, delete-orphan")
    quality_score: Mapped[Optional["QualityScore"]] = relationship("QualityScore", back_populates="version", uselist=False, cascade="all, delete-orphan")
    patterns: Mapped[List["PatternResult"]] = relationship("PatternResult", back_populates="version", cascade="all, delete-orphan")
    insights: Mapped[List["Insight"]] = relationship("Insight", back_populates="version", cascade="all, delete-orphan")
    reports: Mapped[List["Report"]] = relationship("Report", back_populates="version", cascade="all, delete-orphan")
    embeddings: Mapped[List["Embedding"]] = relationship("Embedding", back_populates="version", cascade="all, delete-orphan")
