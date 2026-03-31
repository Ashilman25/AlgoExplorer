import re
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, field_validator


EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
USERNAME_PATTERN = re.compile(r"^[a-z0-9_-]{3,24}$")


class RegisterRequest(BaseModel):
    model_config = ConfigDict(extra = "forbid")

    email: str
    username: str
    password: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        
        if not EMAIL_PATTERN.match(normalized):
            raise ValueError("Enter a valid email address.")
        
        return normalized

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        normalized = value.strip().lower()
        
        if not USERNAME_PATTERN.match(normalized):
            raise ValueError("Username must be 3-24 characters using lowercase letters, numbers, underscores, or hyphens.")
        
        return normalized

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters.")
        
        if len(value) > 128:
            raise ValueError("Password must be at most 128 characters.")
        return value


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra = "forbid")

    email: str
    password: str

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        
        if not EMAIL_PATTERN.match(normalized):
            raise ValueError("Enter a valid email address.")
        
        return normalized

    @field_validator("password")
    @classmethod
    def require_password(cls, value: str) -> str:
        if not value:
            raise ValueError("Password is required.")
        
        return value



class AuthUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes = True)

    id: int
    email: str
    username: str
    settings: dict[str, Any]


class AuthTokenResponse(BaseModel):
    user: AuthUserResponse
    access_token: str
    token_type: Literal["bearer"] = "bearer"


class LogoutResponse(BaseModel):
    message: str


class ChartPreferencesUpdate(BaseModel):
    model_config = ConfigDict(extra = "forbid")

    show_grid: bool | None = None
    show_legend: bool | None = None
    color_scheme: Literal["default", "monochrome", "colorblind"] | None = None


class UpdateSettingsRequest(BaseModel):
    model_config = ConfigDict(extra = "forbid")

    theme: Literal["dark", "light"] | None = None
    default_playback_speed: float | None = None
    explanation_verbosity: Literal["none", "standard", "detailed"] | None = None
    animation_detail: Literal["minimal", "standard", "full"] | None = None
    chart_preferences: ChartPreferencesUpdate | None = None

    @field_validator("default_playback_speed")
    @classmethod
    def validate_speed(cls, value: float | None) -> float | None:
        if value is not None and not (0.25 <= value <= 4.0):
            raise ValueError("Playback speed must be between 0.25 and 4.0.")
        
        return value


class ClaimGuestDataRequest(BaseModel):
    model_config = ConfigDict(extra = "forbid")

    run_ids: list[int] = []
    benchmark_ids: list[int] = []
    guest_session_id: str = ""


class ClaimGuestDataResponse(BaseModel):
    runs_claimed: int
    benchmarks_claimed: int
