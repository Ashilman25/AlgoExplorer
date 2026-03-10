from typing import Any
from pydantic import BaseModel


class ErrorDetail(BaseModel):
    error_code: str
    message: str
    details: dict[str, Any] | None = None


class ErrorResponse(BaseModel):
    error: ErrorDetail
