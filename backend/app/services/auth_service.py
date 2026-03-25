import base64
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import settings
from app.data.models import AuthSession, UserAccount, default_user_settings
from app.db import get_db
from app.exceptions import AuthenticationError, ConflictError
from app.observability import get_logger, compact_context
from app.schemas.auth import AuthTokenResponse, AuthUserResponse, LoginRequest, RegisterRequest


PASSWORD_ALGORITHM = "pbkdf2_sha256"
SESSION_TOKEN_BYTES = 32

oauth2_scheme = OAuth2PasswordBearer(tokenUrl = "/api/auth/login", auto_error = False)
logger = get_logger("services.auth")

