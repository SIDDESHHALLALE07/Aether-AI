import os
import json
import logging
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from jose import jwt

from app.core.config import settings
from app.core.database import get_db
from app.models.dataset import Dataset, DatasetVersion
from app.models.copilot import Conversation, Message
from app.schemas.common import ApiResponse
from app.schemas.copilot import (
    ChatRequest,
    MessageResponse,
    ConversationResponse,
    ConversationSummaryResponse,
    ConversationCreate,
    ConversationUpdate
)
from app.ai.gateway import gemini_gateway

logger = logging.getLogger(__name__)

router = APIRouter()

def get_user_id(request: Request) -> str:
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            uid = payload.get("sub")
            if uid:
                return uid
        except Exception:
            pass
    return "default-user"

@router.post("/chat", response_model=ApiResponse[MessageResponse])
def chat_with_copilot(
    request: Request,
    chat_in: ChatRequest,
    db: Session = Depends(get_db)
):
    try:
        user_id = get_user_id(request)
        dataset_id = chat_in.dataset_id
        dataset = None

        # Verify dataset access if provided
        if dataset_id:
            dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
            if not dataset:
                raise HTTPException(status_code=404, detail="I couldn't find the selected dataset.")

        # Resolve or create Conversation
        conversation = None
        if chat_in.conversation_id:
            conversation = db.query(Conversation).filter(
                Conversation.id == chat_in.conversation_id,
                Conversation.user_id == user_id
            ).first()

        if not conversation:
            if dataset_id:
                conversation = db.query(Conversation).filter(
                    Conversation.dataset_id == dataset_id,
                    Conversation.user_id == user_id
                ).order_by(Conversation.updated_at.desc()).first()

            if not conversation:
                default_title = f"Chat - {dataset.original_filename}" if dataset else f"{chat_in.message[:28]}..."
                conversation = Conversation(
                    dataset_id=dataset_id,
                    project_id=chat_in.project_id or (dataset.project_id if dataset else None),
                    user_id=user_id,
                    title=default_title
                )
                db.add(conversation)
                db.commit()
                db.refresh(conversation)

        # Update dataset on conversation if changed
        if dataset_id and conversation.dataset_id != dataset_id:
            conversation.dataset_id = dataset_id
            db.commit()

        # Save User Message
        user_msg = Message(
            conversation_id=conversation.id,
            sender="user",
            content=chat_in.message
        )
        db.add(user_msg)
        db.commit()

        # Fetch recent conversation history for multi-turn context
        past_messages = db.query(Message).filter(
            Message.conversation_id == conversation.id
        ).order_by(Message.created_at.asc()).all()

        history_list = [
            {
                "sender": m.sender,
                "content": m.content,
                "evidence": m.evidence
            }
            for m in past_messages[:-1] # exclude the user message just added
        ]

        # Load user personalized style preferences if available
        settings_file = os.path.join("./storage/settings", "app_settings.json")
        user_settings = {}
        if os.path.exists(settings_file):
            try:
                with open(settings_file, "r", encoding="utf-8") as f:
                    user_settings = json.load(f)
            except Exception:
                pass

        response_style = user_settings.get("copilot_style", "balanced")
        explanation_level = user_settings.get("copilot_level", "beginner")

        # Process through AI Gateway
        ai_text, evidence_dict = gemini_gateway.process_chat(
            user_message=chat_in.message,
            user_id="default-user",
            db=db,
            dataset_id=dataset_id,
            project_id=conversation.project_id,
            conversation_history=history_list,
            response_style=response_style,
            explanation_level=explanation_level
        )

        # Save Bot Response
        bot_msg = Message(
            conversation_id=conversation.id,
            sender="bot",
            content=ai_text,
            evidence=evidence_dict
        )
        db.add(bot_msg)
        
        # Touch conversation updated_at
        conversation.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(bot_msg)

        return {
            "success": True,
            "data": bot_msg,
            "error": None
        }

    except HTTPException:
        raise
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Error in chat_with_copilot: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="I encountered an issue processing your analytical request. Please try again."
        )


@router.get("/conversations", response_model=ApiResponse[List[ConversationSummaryResponse]])
def list_conversations(
    request: Request,
    db: Session = Depends(get_db)
):
    try:
        user_id = get_user_id(request)
        conversations = db.query(Conversation).filter(
            Conversation.user_id == user_id
        ).order_by(Conversation.updated_at.desc()).all()

        summaries = []
        for c in conversations:
            last_msg = db.query(Message).filter(
                Message.conversation_id == c.id
            ).order_by(Message.created_at.desc()).first()

            msg_count = db.query(Message).filter(
                Message.conversation_id == c.id
            ).count()

            dataset_name = None
            if c.dataset_id:
                ds = db.query(Dataset).filter(Dataset.id == c.dataset_id).first()
                if ds:
                    dataset_name = ds.original_filename

            summaries.append({
                "id": c.id,
                "user_id": c.user_id,
                "dataset_id": c.dataset_id,
                "project_id": c.project_id,
                "dataset_name": dataset_name,
                "title": c.title or "Conversation",
                "last_message": last_msg.content[:60] if last_msg else None,
                "message_count": msg_count,
                "created_at": c.created_at,
                "updated_at": c.updated_at
            })

        return {
            "success": True,
            "data": summaries,
            "error": None
        }
    except Exception as e:
        logger.error(f"Error listing conversations: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to load conversations.")


@router.post("/conversations", response_model=ApiResponse[ConversationResponse])
def create_conversation(
    request: Request,
    conv_in: Optional[ConversationCreate] = None,
    db: Session = Depends(get_db)
):
    try:
        user_id = get_user_id(request)
        dataset_id = conv_in.dataset_id if conv_in else None
        title = conv_in.title if (conv_in and conv_in.title) else "New Conversation"

        if dataset_id:
            ds = db.query(Dataset).filter(Dataset.id == dataset_id).first()
            if ds:
                title = f"Chat - {ds.original_filename}"

        conv = Conversation(
            user_id=user_id,
            dataset_id=dataset_id,
            project_id=conv_in.project_id if conv_in else None,
            title=title
        )
        db.add(conv)
        db.commit()
        db.refresh(conv)

        return {
            "success": True,
            "data": conv,
            "error": None
        }
    except Exception as e:
        logger.error(f"Error creating conversation: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to start new conversation.")


@router.get("/conversations/{conversation_id}", response_model=ApiResponse[ConversationResponse])
def get_conversation_details(
    request: Request,
    conversation_id: str,
    db: Session = Depends(get_db)
):
    user_id = get_user_id(request)
    conv = db.query(Conversation).filter(
        Conversation.id == conversation_id
    ).first()
    if not conv or (conv.user_id != user_id and conv.user_id != "default-user"):
        raise HTTPException(status_code=404, detail="Conversation not found.")

    return {
        "success": True,
        "data": conv,
        "error": None
    }


@router.patch("/conversations/{conversation_id}", response_model=ApiResponse[ConversationResponse])
def rename_conversation(
    request: Request,
    conversation_id: str,
    update_in: ConversationUpdate,
    db: Session = Depends(get_db)
):
    user_id = get_user_id(request)
    conv = db.query(Conversation).filter(
        Conversation.id == conversation_id
    ).first()
    if not conv or (conv.user_id != user_id and conv.user_id != "default-user"):
        raise HTTPException(status_code=404, detail="Conversation not found.")

    conv.title = update_in.title
    db.commit()
    db.refresh(conv)

    return {
        "success": True,
        "data": conv,
        "error": None
    }


@router.delete("/conversations/{conversation_id}", response_model=ApiResponse[dict])
def delete_conversation(
    request: Request,
    conversation_id: str,
    db: Session = Depends(get_db)
):
    user_id = get_user_id(request)
    conv = db.query(Conversation).filter(
        Conversation.id == conversation_id
    ).first()
    if not conv or (conv.user_id != user_id and conv.user_id != "default-user"):
        raise HTTPException(status_code=404, detail="Conversation not found.")

    db.delete(conv)
    db.commit()

    return {
        "success": True,
        "data": {"message": "Conversation deleted successfully"},
        "error": None
    }


# Backwards compatibility endpoints
@router.get("/{dataset_id}/history", response_model=ApiResponse[ConversationResponse])
def get_chat_history(
    dataset_id: str,
    db: Session = Depends(get_db)
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    conversation = db.query(Conversation).filter(
        Conversation.dataset_id == dataset_id
    ).order_by(Conversation.updated_at.desc()).first()

    if not conversation:
        return {
            "success": True,
            "data": {
                "id": "new-conv",
                "dataset_id": dataset_id,
                "project_id": dataset.project_id,
                "user_id": "default-user",
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
    db: Session = Depends(get_db)
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    conversations = db.query(Conversation).filter(
        Conversation.dataset_id == dataset_id
    ).all()

    for c in conversations:
        db.query(Message).filter(Message.conversation_id == c.id).delete()
    db.commit()

    return {
        "success": True,
        "data": {"message": "Chat history cleared successfully"},
        "error": None
    }
