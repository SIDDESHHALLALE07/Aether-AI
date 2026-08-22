from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.dataset import Dataset, DatasetVersion
from app.models.profile import DataProfile, QualityScore
from app.models.analytics import PatternResult
from app.models.copilot import Conversation, Message
from app.schemas.common import ApiResponse
from app.schemas.copilot import ChatRequest, MessageResponse, ConversationResponse
from app.ai.gateway import gemini_gateway

router = APIRouter()

@router.post("/chat", response_model=ApiResponse[MessageResponse])
def chat_with_copilot(
    chat_in: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dataset = db.query(Dataset).filter(Dataset.id == chat_in.dataset_id, Dataset.user_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    version = db.query(DatasetVersion).filter(
        DatasetVersion.dataset_id == chat_in.dataset_id,
        DatasetVersion.version_number == dataset.current_version_num
    ).first()
    if not version:
        raise HTTPException(status_code=404, detail="Dataset version not found")

    # Get or create Conversation
    conversation = db.query(Conversation).filter(
        Conversation.dataset_id == chat_in.dataset_id,
        Conversation.user_id == current_user.id
    ).first()
    
    if not conversation:
        conversation = Conversation(
            dataset_id=chat_in.dataset_id,
            user_id=current_user.id,
            title=f"Chat - {dataset.original_filename}"
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

    # Save User Message
    user_msg = Message(
        conversation_id=conversation.id,
        sender="user",
        content=chat_in.message
    )
    db.add(user_msg)
    db.commit()

    # Load evidence context
    profile = db.query(DataProfile).filter(DataProfile.dataset_version_id == version.id).first()
    quality = db.query(QualityScore).filter(QualityScore.dataset_version_id == version.id).first()
    patterns = db.query(PatternResult).filter(PatternResult.dataset_version_id == version.id).all()

    meta = {
        "filename": dataset.original_filename,
        "row_count": version.row_count,
        "column_count": version.column_count,
        "version_number": version.version_number,
        "data_types": profile.data_types if profile else {}
    }
    
    prof_dict = profile.numeric_summary if profile else None
    qual_dict = {
        "overall_score": quality.overall_score,
        "completeness_score": quality.completeness_score,
        "uniqueness_score": quality.uniqueness_score,
        "detected_issues": quality.detected_issues
    } if quality else None

    pat_list = [
        {
            "pattern_type": p.pattern_type,
            "explanation": p.explanation,
            "metrics": p.statistical_metrics
        } for p in patterns
    ]

    # Generate AI Response
    ai_text, evidence_dict = gemini_gateway.generate_grounded_response(
        user_message=chat_in.message,
        dataset_meta=meta,
        profile_summary=prof_dict,
        quality_score=qual_dict,
        patterns=pat_list
    )

    # Save Bot Response
    bot_msg = Message(
        conversation_id=conversation.id,
        sender="bot",
        content=ai_text,
        evidence=evidence_dict
    )
    db.add(bot_msg)
    db.commit()
    db.refresh(bot_msg)

    return {
        "success": True,
        "data": bot_msg,
        "error": None
    }

@router.get("/{dataset_id}/history", response_model=ApiResponse[ConversationResponse])
def get_chat_history(
    dataset_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.user_id == current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    conversation = db.query(Conversation).filter(
        Conversation.dataset_id == dataset_id,
        Conversation.user_id == current_user.id
    ).first()

    if not conversation:
        return {
            "success": True,
            "data": {
                "id": "new-conv",
                "dataset_id": dataset_id,
                "user_id": current_user.id,
                "title": f"Chat - {dataset.original_filename}",
                "messages": [],
                "created_at": dataset.created_at,
                "updated_at": dataset.updated_at
            },
            "error": None
        }

    return {
        "success": True,
        "data": conversation,
        "error": None
    }

@router.delete("/{dataset_id}/clear", response_model=ApiResponse[dict])
def clear_chat_history(
    dataset_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    conversation = db.query(Conversation).filter(
        Conversation.dataset_id == dataset_id,
        Conversation.user_id == current_user.id
    ).first()

    if conversation:
        db.query(Message).filter(Message.conversation_id == conversation.id).delete()
        db.commit()

    return {
        "success": True,
        "data": {"message": "Chat history cleared successfully"},
        "error": None
    }
