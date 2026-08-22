from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.common import ApiResponse
from app.schemas.user import UserCreate, UserLogin, UserResponse, TokenResponse

router = APIRouter()

@router.post("/register", response_model=ApiResponse[UserResponse])
def register(user_in: UserCreate):
    # Registration endpoint placeholder for M5 (M6 builds full auth logic)
    return {
        "success": True,
        "data": {
            "id": "demo-user-id",
            "email": user_in.email,
            "full_name": user_in.full_name,
            "role": "user",
            "is_active": True,
            "created_at": "2026-08-22T00:00:00Z"
        },
        "error": None
    }

@router.post("/login", response_model=ApiResponse[TokenResponse])
def login(credentials: UserLogin):
    # Login endpoint placeholder for M5
    return {
        "success": True,
        "data": {
            "access_token": "demo-jwt-access-token",
            "refresh_token": "demo-jwt-refresh-token",
            "token_type": "bearer",
            "user": {
                "id": "demo-user-id",
                "email": credentials.email,
                "full_name": "Demo User",
                "role": "user",
                "is_active": True,
                "created_at": "2026-08-22T00:00:00Z"
            }
        },
        "error": None
    }

@router.get("/me", response_model=ApiResponse[UserResponse])
def get_me():
    return {
        "success": True,
        "data": {
            "id": "demo-user-id",
            "email": "demo@aether.ai",
            "full_name": "Demo Lead Engineer",
            "role": "admin",
            "is_active": True,
            "created_at": "2026-08-22T00:00:00Z"
        },
        "error": None
    }
