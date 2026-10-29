from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token, create_refresh_token, get_current_user
from app.models.user import User, UserSession
from datetime import datetime, timedelta, timezone
from app.core.config import settings
from pydantic import BaseModel
from jose import jwt, JWTError
from app.schemas.common import ApiResponse
from app.schemas.user import UserCreate, UserLogin, UserResponse, TokenResponse, UserSettings, UserSettingsUpdate

router = APIRouter()

@router.post("/register", response_model=ApiResponse[UserResponse])
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    normalized_email = user_in.email.strip().lower()
    existing_user = db.query(User).filter(func.lower(User.email) == normalized_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists."
        )
    
    new_user = User(
        email=normalized_email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name.strip() if user_in.full_name else None,
        role=user_in.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {
        "success": True,
        "data": new_user,
        "error": None
    }

@router.post("/login", response_model=ApiResponse[TokenResponse])
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    normalized_email = credentials.email.strip().lower()
    user = db.query(User).filter(func.lower(User.email) == normalized_email).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account"
        )
    
    access_token = create_access_token(subject=user.id)
    refresh_token = create_refresh_token(subject=user.id)
    
    # Save the refresh token in the database
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    session_rec = UserSession(
        user_id=user.id,
        refresh_token_hash=get_password_hash(refresh_token),
        expires_at=expires_at
    )
    db.add(session_rec)
    db.commit()
    
    return {
        "success": True,
        "data": {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": user
        },
        "error": None
    }

class RefreshRequest(BaseModel):
    refresh_token: str

@router.post("/refresh", response_model=ApiResponse[TokenResponse])
def refresh(req: RefreshRequest, db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(req.refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        token_type = payload.get("type")
        if not user_id or token_type != "refresh":
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise credentials_exception
        
    # Check if the session exists and is valid
    # Since we can't easily lookup by plain token, we iterate over user's valid sessions
    now = datetime.now(timezone.utc)
    sessions = db.query(UserSession).filter(
        UserSession.user_id == user.id,
        UserSession.is_revoked == False,
        UserSession.expires_at > now
    ).all()
    
    valid_session = None
    for session_rec in sessions:
        if verify_password(req.refresh_token, session_rec.refresh_token_hash):
            valid_session = session_rec
            break
            
    if not valid_session:
        raise credentials_exception
        
    # Revoke the old refresh token (refresh token rotation)
    valid_session.is_revoked = True
    
    access_token = create_access_token(subject=user.id)
    new_refresh_token = create_refresh_token(subject=user.id)
    
    # Save the new refresh token
    new_expires_at = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    new_session_rec = UserSession(
        user_id=user.id,
        refresh_token_hash=get_password_hash(new_refresh_token),
        expires_at=new_expires_at
    )
    db.add(new_session_rec)
    db.commit()
    
    return {
        "success": True,
        "data": {
            "access_token": access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer",
            "user": user
        },
        "error": None
    }

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

@router.put("/change-password", response_model=ApiResponse[dict])
def change_password(
    req: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not verify_password(req.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    if len(req.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters long"
        )
    current_user.hashed_password = get_password_hash(req.new_password)
    db.commit()
    return {
        "success": True,
        "data": {"message": "Password updated successfully"},
        "error": None
    }

@router.get("/me")
def get_me():
    return {
        "success": True,
        "data": {
            "id": "default-user",
            "email": "developer@aethercopilot.local",
            "full_name": "Aether Developer",
            "role": "admin"
        },
        "error": None
    }

def get_user_id_from_req(request: Request) -> str:
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
    return "app_settings"

@router.get("/settings", response_model=ApiResponse[UserSettings])
def get_user_settings(request: Request):
    import os
    import json
    user_id = get_user_id_from_req(request)
    settings_dir = settings.settings_storage_dir
    os.makedirs(settings_dir, exist_ok=True)
    settings_file = os.path.join(settings_dir, f"{user_id}.json" if user_id != "app_settings" else "app_settings.json")
    
    defaults = UserSettings().model_dump()
    if os.path.exists(settings_file):
        try:
            with open(settings_file, "r", encoding="utf-8") as f:
                saved = json.load(f)
                defaults.update(saved)
        except Exception:
            pass
            
    return {
        "success": True,
        "data": UserSettings(**defaults),
        "error": None
    }

@router.put("/settings", response_model=ApiResponse[UserSettings])
def update_user_settings(
    request: Request,
    settings_in: UserSettingsUpdate
):
    import os
    import json
    user_id = get_user_id_from_req(request)
    settings_dir = settings.settings_storage_dir
    os.makedirs(settings_dir, exist_ok=True)
    settings_file = os.path.join(settings_dir, f"{user_id}.json" if user_id != "app_settings" else "app_settings.json")
    
    current_dict = UserSettings().model_dump()
    if os.path.exists(settings_file):
        try:
            with open(settings_file, "r", encoding="utf-8") as f:
                current_dict.update(json.load(f))
        except Exception:
            pass
            
    update_data = {k: v for k, v in settings_in.model_dump().items() if v is not None}
    current_dict.update(update_data)
    
    with open(settings_file, "w", encoding="utf-8") as f:
        json.dump(current_dict, f, indent=2)
        
    return {
        "success": True,
        "data": UserSettings(**current_dict),
        "error": None
    }

