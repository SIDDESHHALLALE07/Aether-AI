from fastapi import APIRouter
from app.schemas.common import ApiResponse
from app.schemas.copilot import ChatRequest, MessageResponse, ConversationResponse

router = APIRouter()

@router.post("/chat", response_model=ApiResponse[MessageResponse])
def chat_with_copilot(chat_in: ChatRequest):
    return {
        "success": True,
        "data": {
            "id": "msg-bot-99",
            "conversation_id": "conv-1",
            "sender": "bot",
            "content": f"Based on your query '{chat_in.message}', the data shows a 42.7% churn rate among Month-to-Month contract users with Fiber Optic internet service.",
            "evidence": {"chunk_id": "emb-123", "confidence": 0.94},
            "created_at": "2026-08-22T00:00:00Z"
        },
        "error": None
    }

@router.get("/{dataset_id}/history", response_model=ApiResponse[ConversationResponse])
def get_chat_history(dataset_id: str):
    return {
        "success": True,
        "data": {
            "id": "conv-1",
            "dataset_id": dataset_id,
            "user_id": "demo-user-id",
            "title": "Customer Churn Copilot Session",
            "messages": [
                {
                    "id": "msg-user-1",
                    "conversation_id": "conv-1",
                    "sender": "user",
                    "content": "What are the primary churn drivers?",
                    "evidence": None,
                    "created_at": "2026-08-22T00:00:00Z"
                },
                {
                    "id": "msg-bot-1",
                    "conversation_id": "conv-1",
                    "sender": "bot",
                    "content": "The top churn drivers are Month-to-Month contracts, Fiber Optic service, and tenure under 12 months.",
                    "evidence": {"drivers": ["Contract", "InternetService", "Tenure"]},
                    "created_at": "2026-08-22T00:00:01Z"
                }
            ],
            "created_at": "2026-08-22T00:00:00Z",
            "updated_at": "2026-08-22T00:00:01Z"
        },
        "error": None
    }
