from __future__ import annotations
import uuid
from sqlalchemy import String, Text, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from typing import Optional, TYPE_CHECKING
from app.core.base import Base
from app.core.config import settings

if TYPE_CHECKING:
    from app.models.dataset import DatasetVersion

def generate_uuid():
    return str(uuid.uuid4())

# Vector type fallback handling for SQLite vs PostgreSQL pgvector
try:
    if "sqlite" not in settings.DATABASE_URL:
        from pgvector.sqlalchemy import Vector
        VectorType = Vector(384)
    else:
        VectorType = Text
except Exception:
    VectorType = Text

class Embedding(Base):
    __tablename__ = "embeddings"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, default="default-user", index=True)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    dataset_version_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("dataset_versions.id", ondelete="CASCADE"), nullable=True)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False) # insight | pattern | report_section | conversation
    entity_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    content_chunk: Mapped[str] = mapped_column(Text, nullable=False)
    embedding_data: Mapped[Optional[str]] = mapped_column(VectorType, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    version: Mapped[Optional["DatasetVersion"]] = relationship("DatasetVersion", back_populates="embeddings")
