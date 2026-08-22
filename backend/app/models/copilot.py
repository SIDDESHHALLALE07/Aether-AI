import uuid
from sqlalchemy import String, Text, ForeignKey, JSON, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from typing import Optional, List
from app.core.base import Base, TimestampMixin

def generate_uuid():
    return str(uuid.uuid4())

class Conversation(Base, TimestampMixin):
    __tablename__ = "conversations"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    dataset_id: Mapped[str] = mapped_column(String(36), ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    messages: Mapped[List["Message"]] = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = "messages"
    
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    conversation_id: Mapped[str] = mapped_column(String(36), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    sender: Mapped[str] = mapped_column(String(20), nullable=False) # user | bot | system
    content: Mapped[str] = mapped_column(Text, nullable=False)
    evidence: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    conversation: Mapped["Conversation"] = relationship("Conversation", back_populates="messages")
