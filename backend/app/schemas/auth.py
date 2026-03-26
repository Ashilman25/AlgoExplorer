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


class ClaimGuestDataRequest(BaseModel):
    model_config = ConfigDict(extra = "forbid")

    run_ids: list[int] = []
    benchmark_ids: list[int] = []


class ClaimGuestDataResponse(BaseModel):
    runs_claimed: int
    benchmarks_claimed: int
