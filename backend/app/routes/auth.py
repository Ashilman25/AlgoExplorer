from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.auth import AuthTokenResponse, AuthUserResponse, LoginRequest, LogoutResponse, RegisterRequest
from app.services.auth_service import get_current_auth_session, get_current_user, login_user_account, logout_auth_session, register_user_account


router = APIRouter(prefix = "/api/auth", tags = ["auth"])


@router.post("/register", response_model = AuthTokenResponse, status_code = status.HTTP_201_CREATED)
def register_user(body: RegisterRequest, db: Session = Depends(get_db)):
    return register_user_account(body, db)


@router.post("/login", response_model = AuthTokenResponse)
def login_user(body: LoginRequest, db: Session = Depends(get_db)):
    return login_user_account(body, db)


@router.get("/me", response_model = AuthUserResponse)
def get_me(current_user = Depends(get_current_user)):
    return AuthUserResponse.model_validate(current_user)


@router.post("/logout", response_model = LogoutResponse)
def logout_user(current_session = Depends(get_current_auth_session), db: Session = Depends(get_db)):
    logout_auth_session(current_session, db)
    return LogoutResponse(message = "Logged out.")
