import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "Aether Copilot AI"
    API_V1_STR: str = "/api/v1"
    PORT: int = 8000
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "info"
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    
    # Security & JWT
    SECRET_KEY: str = "aether-copilot-secure-secret-key-change-in-production-64bytes"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Database
    DATABASE_URL: str = "sqlite:///./aether_dev.db"
    
    # Storage
    STORAGE_DRIVER: str = "local"
    LOCAL_STORAGE_PATH: str = "./storage/uploads"
    
    # R2 Storage
    R2_ACCOUNT_ID: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET_NAME: str = "aether-datasets"
    
    # Gemini AI
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
