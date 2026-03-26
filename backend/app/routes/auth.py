from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.data.models import SimulationRun, BenchmarkJob, UserAccount
from app.schemas.auth import AuthTokenResponse, AuthUserResponse, LoginRequest, LogoutResponse, RegisterRequest, ClaimGuestDataRequest, ClaimGuestDataResponse
from app.services.auth_service import get_current_auth_session, get_current_user, login_user_account, logout_auth_session, register_user_account
from app.observability import get_logger, compact_context

logger = get_logger("routes.auth")


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


@router.post("/claim", response_model = ClaimGuestDataResponse)
def claim_guest_data(body: ClaimGuestDataRequest, current_user: UserAccount = Depends(get_current_user), db: Session = Depends(get_db)):
    runs_claimed = 0
    benchmarks_claimed = 0

    if body.run_ids:
        runs_claimed = (
            db.query(SimulationRun)
            .filter(SimulationRun.id.in_(body.run_ids), SimulationRun.user_id.is_(None))
            .update({"user_id": current_user.id}, synchronize_session = "fetch")
        )

    if body.benchmark_ids:
        benchmarks_claimed = (
            db.query(BenchmarkJob)
            .filter(BenchmarkJob.id.in_(body.benchmark_ids), BenchmarkJob.user_id.is_(None))
            .update({"user_id": current_user.id}, synchronize_session = "fetch")
        )

    db.commit()

    logger.info(
        "auth.claim.completed %s",
        compact_context(
            user_id = current_user.id,
            runs_claimed = runs_claimed,
            benchmarks_claimed = benchmarks_claimed,
        ),
    )
    
    guest_data_response = ClaimGuestDataResponse(
        runs_claimed = runs_claimed,
        benchmarks_claimed = benchmarks_claimed
    )
    
    return guest_data_response
