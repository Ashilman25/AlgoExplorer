import copy

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.data.models import SimulationRun, BenchmarkJob, UserAccount
from app.schemas.auth import AuthTokenResponse, AuthUserResponse, LoginRequest, LogoutResponse, RegisterRequest, ClaimGuestDataRequest, ClaimGuestDataResponse, UpdateSettingsRequest
from app.services.auth_service import get_current_auth_session, get_current_user, login_user_account, logout_auth_session, register_user_account
from app.config import settings
from app.observability import get_logger, compact_context
from app.rate_limiting import limiter
from app.persistence import safe_json_value

logger = get_logger("routes.auth")


router = APIRouter(prefix = "/api/auth", tags = ["auth"])


@router.post("/register", response_model = AuthTokenResponse, status_code = status.HTTP_201_CREATED)
@limiter.limit(settings.rate_limit_auth)
def register_user(request: Request, body: RegisterRequest, db: Session = Depends(get_db)):
    return register_user_account(body, db)


@router.post("/login", response_model = AuthTokenResponse)
@limiter.limit(settings.rate_limit_auth)
def login_user(request: Request, body: LoginRequest, db: Session = Depends(get_db)):
    return login_user_account(body, db)


@router.get("/me", response_model = AuthUserResponse)
def get_me(current_user = Depends(get_current_user)):
    return AuthUserResponse.model_validate(current_user)


@router.post("/logout", response_model = LogoutResponse)
def logout_user(current_session = Depends(get_current_auth_session), db: Session = Depends(get_db)):
    logout_auth_session(current_session, db)
    return LogoutResponse(message = "Logged out.")


@router.patch("/settings", response_model = AuthUserResponse)
def update_settings(body: UpdateSettingsRequest, current_user: UserAccount = Depends(get_current_user), db: Session = Depends(get_db)):
    current = copy.deepcopy(current_user.settings)
    updates = body.model_dump(exclude_none = True)

    # Deep-merge chart_preferences
    if "chart_preferences" in updates:
        current_chart = current.get("chart_preferences", {})
        current_chart.update(updates.pop("chart_preferences"))
        current["chart_preferences"] = current_chart

    current.update(updates)
    current_user.settings = safe_json_value(current, label = "user settings")
    db.commit()
    db.refresh(current_user)

    logger.info(
        "auth.settings.updated %s",
        compact_context(user_id = current_user.id, changed_keys = list(body.model_dump(exclude_none = True).keys())),
    )

    return AuthUserResponse.model_validate(current_user)


@router.post("/claim", response_model = ClaimGuestDataResponse)
@limiter.limit(settings.rate_limit_auth)
def claim_guest_data(request: Request, body: ClaimGuestDataRequest, current_user: UserAccount = Depends(get_current_user), db: Session = Depends(get_db)):
    runs_claimed = 0
    benchmarks_claimed = 0

    if body.run_ids and body.guest_session_id:
        runs_claimed = (
            db.query(SimulationRun)
            .filter(
                SimulationRun.id.in_(body.run_ids),
                SimulationRun.user_id.is_(None),
                SimulationRun.guest_session_id == body.guest_session_id,
            )
            .update({"user_id": current_user.id}, synchronize_session = "fetch")
        )

    if body.benchmark_ids and body.guest_session_id:
        benchmarks_claimed = (
            db.query(BenchmarkJob)
            .filter(
                BenchmarkJob.id.in_(body.benchmark_ids),
                BenchmarkJob.user_id.is_(None),
                BenchmarkJob.guest_session_id == body.guest_session_id,
            )
            .update({"user_id": current_user.id}, synchronize_session = "fetch")
        )

    db.commit()

    logger.info(
        "auth.claim.completed %s",
        compact_context(
            user_id = current_user.id,
            runs_claimed = runs_claimed,
            benchmarks_claimed = benchmarks_claimed,
            guest_session_id = body.guest_session_id or None,
        ),
    )

    return ClaimGuestDataResponse(
        runs_claimed = runs_claimed,
        benchmarks_claimed = benchmarks_claimed,
    )
