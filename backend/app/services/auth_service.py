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


# helpers
def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, settings.auth_password_iterations)
    
    encoded_salt = base64.b64encode(salt).decode("ascii")
    encoded_digest = base64.b64encode(digest).decode("ascii")
    
    hash_format = [
        PASSWORD_ALGORITHM,
        str(settings.auth_password_iterations),
        encoded_salt,
        encoded_digest
    ]
    
    return "$".join(hash_format)


def hash_session_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def issue_session_token(user_id: int, db: Session) -> str:
    access_token = secrets.token_urlsafe(SESSION_TOKEN_BYTES)
    auth_session = AuthSession(
        user_id = user_id,
        token_hash = hash_session_token(access_token),
        expires_at = datetime.utcnow() + timedelta(hours = settings.auth_session_hours)
    )
    
    db.add(auth_session)
    return access_token




def verify_password(password: str, stored_hash: str) -> bool:
    try:
        algorithm, iterations, salt_b64, digest_b64 = stored_hash.split("$", 3)
    except ValueError:
        return False
    
    if algorithm != PASSWORD_ALGORITHM:
        return False
    
    salt = base64.b64decode(salt_b64.encode("ascii"))
    expected_digest = base64.b64decode(digest_b64.encode("ascii"))
    computed_digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, int(iterations))
    
    return hmac.compare_digest(computed_digest, expected_digest)
