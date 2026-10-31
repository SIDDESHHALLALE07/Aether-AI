import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
WORKSPACE_ROOT = os.path.dirname(BACKEND_DIR)
DEFAULT_DB_FILE = os.path.join(BACKEND_DIR, "aether_dev.db").replace(os.sep, "/")
DEFAULT_DB_URL = f"sqlite:///{DEFAULT_DB_FILE}"
DEFAULT_STORAGE_PATH = os.path.join(BACKEND_DIR, "storage", "uploads")

class Settings(BaseSettings):
    PROJECT_NAME: str = "Aether"
    API_V1_STR: str = "/api/v1"
    PORT: int = 8000
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "info"
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"]
    
    # Security & JWT
    SECRET_KEY: str = "aether-copilot-secure-secret-key-change-in-production-64bytes"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Database (Canonical SQLite path anchored to backend directory)
    DATABASE_URL: str = DEFAULT_DB_URL
    
    # Storage
    STORAGE_DRIVER: str = "local"
    LOCAL_STORAGE_PATH: str = DEFAULT_STORAGE_PATH
    
    # R2 Storage
    R2_ACCOUNT_ID: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET_NAME: str = "aether-datasets"
    
    # Gemini AI
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.5-flash"
    
    @property
    def clean_gemini_api_key(self) -> str:
        key = self.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")
        clean = key.strip("<> \t\r\n\"'")
        if not clean or "your_api_key" in clean.lower() or "<your" in clean.lower() or "placeholder" in clean.lower():
            return ""
        return clean

    @property
    def backend_dir(self) -> str:
        return BACKEND_DIR

    @property
    def settings_storage_dir(self) -> str:
        d = os.path.join(BACKEND_DIR, "storage", "settings")
        os.makedirs(d, exist_ok=True)
        return d

    @property
    def reports_dir(self) -> str:
        d = os.path.join(BACKEND_DIR, "reports")
        os.makedirs(d, exist_ok=True)
        return d

    model_config = SettingsConfigDict(
        env_file=(
            os.path.join(BACKEND_DIR, ".env"),
            os.path.join(WORKSPACE_ROOT, ".env"),
            ".env"
        ),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

