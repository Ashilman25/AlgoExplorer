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


def build_auth_response(user: UserAccount, access_token: str) -> AuthTokenResponse:
    response = AuthTokenResponse(
        user = AuthUserResponse.model_validate(user),
        access_token = access_token,
        token_type = "bearer"
    )
    
    return response

    
# main funcs


def register_user_account(payload: RegisterRequest, db: Session) -> AuthTokenResponse:
    
    existing_email = db.query(UserAccount).filter(UserAccount.email == payload.email).first()
    if existing_email:
        logger.warning(
            "auth.register.conflict %s",
            compact_context(email = payload.email, reason = "email_taken")
        )
        
        raise ConflictError(
            "An account with that email already exists.",
            details = {"field" : "email"}
        )
        
    
    existing_username = db.query(UserAccount).filter(UserAccount.username == payload.username).first()
    if existing_username:
        logger.warning(
            "auth.register.conflict %s",
            compact_context(username = payload.username, reason = "username_taken")
        )
        
        raise ConflictError("That username is already in use.", details = {"field" : "username"})
    
    user = UserAccount(
        email = payload.email,
        username = payload.username,
        password_hash = hash_password(payload.password),
        settings = default_user_settings()
    )
    
    db.add(user)
    access_token = None
    
    try:
        db.flush()
        access_token = issue_session_token(user.id, db)
        db.commit()
        
    except IntegrityError:
        db.rollback()
        logger.warning(
            "auth.register.conflict %s",
            compact_context(email = payload.email, username = payload.username, reason = "integrity_error"),
        )
        raise ConflictError("An account with those credentials already exists.")
    
    db.refresh(user)
    logger.info(
        "auth.register.succeeded %s",
        compact_context(user_id = user.id, email = user.email, username = user.username),
    )
    
    return build_auth_response(user, access_token)
    
    
    
    
def login_user_account(payload: LoginRequest, db: Session) -> AuthTokenResponse:
    user = db.query(UserAccount).filter(UserAccount.email == payload.email).first()
    
    if user is None or not verify_password(payload.password, user.password_hash):
        logger.warning(
            "auth.login.failed %s",
            compact_context(email = payload.email, reason = "invalid_credentials")
        )
        raise AuthenticationError("Invalid email or password.")
    
    access_token = issue_session_token(user.id, db)
    db.commit()
    db.refresh(user)
    
    logger.info(
        "auth.login.succeeded %s",
        compact_context(user_id = user.id, email = user.email),
    )
    
    return build_auth_response(user, access_token)



def logout_auth_session(auth_session: AuthSession, db: Session) -> None:
    auth_session.revoked_at = datetime.utcnow()
    db.commit()
    
    logger.info(
        "auth.logout.succeeded %s",
        compact_context(user_id = auth_session.user_id, session_id = auth_session.id),
    )
    
    
    
    
def get_current_auth_session(token: str | None = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> AuthSession:
    if not token:
        raise AuthenticationError("Authentication required.")
    
    auth_session = db.query(AuthSession).filter(AuthSession.token_hash == hash_session_token(token)).first()
    if auth_session is None:
        logger.warning("auth.session.invalid %s", compact_context(reason = "not_found"))
        raise AuthenticationError("Invalid or expired token.")
    
    
    if auth_session.revoked_at is not None:
        logger.warning(
            "auth.session.invalid %s",
            compact_context(session_id = auth_session.id, user_id = auth_session.user_id, reason = "revoked"),
        )
        raise AuthenticationError("Invalid or expired token.")

    if auth_session.expires_at <= datetime.utcnow():
        auth_session.revoked_at = datetime.utcnow()
        db.commit()
        
        logger.warning(
            "auth.session.invalid %s",
            compact_context(session_id = auth_session.id, user_id = auth_session.user_id, reason = "expired"),
        )
        raise AuthenticationError("Invalid or expired token.")

    if auth_session.user is None:
        logger.warning(
            "auth.session.invalid %s",
            compact_context(session_id = auth_session.id, reason = "missing_user"),
        )
        raise AuthenticationError("Invalid or expired token.")

    return auth_session


def get_current_user(auth_session: AuthSession = Depends(get_current_auth_session)) -> UserAccount:
    return auth_session.user


def get_optional_user(token: str | None = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> UserAccount | None:
    """Returns the authenticated user if a valid token is present, otherwise None."""
    if not token:
        return None

    token_hash = hash_session_token(token)
    auth_session = db.query(AuthSession).filter(AuthSession.token_hash == token_hash).first()
    if auth_session is None or auth_session.revoked_at is not None:
        return None

    if auth_session.expires_at <= datetime.utcnow():
        return None

    return auth_session.user