import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.main as main_module
from app.data.models import Base
from app.db import get_db
from app.main import app


@pytest.fixture
def session_factory(monkeypatch):
    engine = create_engine(
        "sqlite://",
        connect_args = {"check_same_thread": False},
        poolclass = StaticPool,
    )
    TestingSessionLocal = sessionmaker(bind = engine)

    def init_test_db():
        Base.metadata.create_all(bind = engine)

    monkeypatch.setattr(main_module, "init_db", init_test_db)
    Base.metadata.create_all(bind = engine)

    yield TestingSessionLocal

    Base.metadata.drop_all(bind = engine)
    engine.dispose()


@pytest.fixture
def client(session_factory):
    def override_get_db():
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


def test_auth_routes_have_rate_limit_decorators():
    """Verify that auth route functions have been wrapped by slowapi's limiter."""
    from app.routes.auth import register_user, login_user, claim_guest_data

    for fn in [register_user, login_user, claim_guest_data]:
        # slowapi wraps the function and stores the original via __wrapped__
        assert hasattr(fn, "__wrapped__"), (
            f"{fn.__name__} is missing a rate limit decorator (no __wrapped__ attribute)"
        )


def test_rate_limit_response_format(client, monkeypatch):
    """Verify the 429 response matches our ErrorResponse envelope."""
    from slowapi.errors import RateLimitExceeded
    from app.main import rate_limit_exceeded_handler
    import asyncio
    import json

    mock_request = MagicMock()
    mock_request.url.path = "/api/auth/login"
    mock_request.method = "POST"
    mock_request.url.query = None

    # RateLimitExceeded extends HTTPException; mock the exception with .detail set
    exc = MagicMock(spec = RateLimitExceeded)
    exc.detail = "5 per 1 minute"

    response = asyncio.run(rate_limit_exceeded_handler(mock_request, exc))

    assert response.status_code == 429
    body = json.loads(response.body)
    assert body["error"]["error_code"] == "RATE_LIMITED"
    assert "login attempts" in body["error"]["message"]
    assert response.headers.get("Retry-After") is not None


def test_rate_limit_response_format_general_endpoint(client):
    """Verify general endpoint 429 message is generic."""
    from app.main import rate_limit_exceeded_handler
    from slowapi.errors import RateLimitExceeded
    import asyncio
    import json

    mock_request = MagicMock()
    mock_request.url.path = "/api/runs/"
    mock_request.method = "POST"
    mock_request.url.query = None

    # RateLimitExceeded extends HTTPException; mock the exception with .detail set
    exc = MagicMock(spec = RateLimitExceeded)
    exc.detail = "30 per 1 minute"

    response = asyncio.run(rate_limit_exceeded_handler(mock_request, exc))

    assert response.status_code == 429
    body = json.loads(response.body)
    assert body["error"]["error_code"] == "RATE_LIMITED"
    assert body["error"]["message"] == "Too many requests. Please try again later."
