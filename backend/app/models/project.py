import uuid
from sqlalchemy import String, Text, Boolean, ForeignKey, JSON, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from typing import Optional, List
from app.core.base import Base, TimestampMixin

def generate_uuid():
    return str(uuid.uuid4())

class Project(Base, TimestampMixin):
    __tablename__ = "projects"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="projects")
    datasets: Mapped[List["Dataset"]] = relationship("Dataset", back_populates="project", cascade="all, delete-orphan")
    activity_logs: Mapped[List["ActivityLog"]] = relationship("ActivityLog", back_populates="project", cascade="all, delete-orphan")

class ActivityLog(Base):
    __tablename__ = "activity_logs"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    action_type: Mapped[str] = mapped_column(String(100), nullable=False)
    details: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    project: Mapped["Project"] = relationship("Project", back_populates="activity_logs")
