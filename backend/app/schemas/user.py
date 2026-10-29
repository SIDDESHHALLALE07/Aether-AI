from pydantic import BaseModel, EmailStr, ConfigDict, field_validator
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    role: str = "user"

    @field_validator('email', mode='before')
    @classmethod
    def normalize_email(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip().lower()
        return v

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

    @field_validator('email', mode='before')
    @classmethod
    def normalize_email(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip().lower()
        return v

class UserResponse(UserBase):
    id: str
    is_active: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse

class TokenRefresh(BaseModel):
    refresh_token: str

class UserSettings(BaseModel):
    theme: str = "light"
    date_format: str = "YYYY-MM-DD"
    number_format: str = "standard"
    copilot_enabled: bool = True
    copilot_style: str = "balanced"
    copilot_level: str = "beginner"
    ai_processing_enabled: bool = True
    outlier_method: str = "iqr"
    correlation_method: str = "pearson"
    missing_value_strategy: str = "median"
    max_chart_count: int = 6
    report_title_template: str = "Executive Intelligence & Analytics Report"
    report_include_summary: bool = True
    report_include_quality: bool = True
    report_include_stats: bool = True
    report_include_charts: bool = True
    report_include_correlations: bool = True
    report_include_patterns: bool = True
    report_include_insights: bool = True
    report_include_recommendations: bool = True
    report_include_cleaning: bool = True
    notify_analysis_complete: bool = True
    notify_cleaning_complete: bool = True
    notify_report_ready: bool = True
    notify_errors: bool = True

class UserSettingsUpdate(BaseModel):
    theme: Optional[str] = None
    date_format: Optional[str] = None
    number_format: Optional[str] = None
    copilot_enabled: Optional[bool] = None
    copilot_style: Optional[str] = None
    copilot_level: Optional[str] = None
    ai_processing_enabled: Optional[bool] = None
    outlier_method: Optional[str] = None
    correlation_method: Optional[str] = None
    missing_value_strategy: Optional[str] = None
    max_chart_count: Optional[int] = None
    report_title_template: Optional[str] = None
    report_include_summary: Optional[bool] = None
    report_include_quality: Optional[bool] = None
    report_include_stats: Optional[bool] = None
    report_include_charts: Optional[bool] = None
    report_include_correlations: Optional[bool] = None
    report_include_patterns: Optional[bool] = None
    report_include_insights: Optional[bool] = None
    report_include_recommendations: Optional[bool] = None
    report_include_cleaning: Optional[bool] = None
    notify_analysis_complete: Optional[bool] = None
    notify_cleaning_complete: Optional[bool] = None
    notify_report_ready: Optional[bool] = None
    notify_errors: Optional[bool] = None

