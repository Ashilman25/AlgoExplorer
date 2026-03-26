import logging

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.main as main_module
from app.data.models import AuthSession, Base, UserAccount
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


def register_payload(**overrides):
    payload = {
        "email": "user@example.com",
        "username": "andrew",
        "password": "securePassword123",
    }
    payload.update(overrides)
    return payload


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_register_creates_account_session_and_logs_success(client, session_factory, caplog):
    caplog.set_level(logging.INFO, logger = "algo_explorer.services.auth")

    response = client.post(
        "/api/auth/register",
        json = register_payload(email = "USER@Example.com", username = "Andrew_1"),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["user"] == {
        "id": 1,
        "email": "user@example.com",
        "username": "andrew_1",
        "settings": {
            "theme": "dark",
            "default_playback_speed": 1.0,
            "explanation_verbosity": "standard",
            "animation_detail": "standard",
        },
    }
    assert body["access_token"]

    with session_factory() as db:
        users = db.query(UserAccount).all()
        sessions = db.query(AuthSession).all()

        assert len(users) == 1
        assert users[0].password_hash != "securePassword123"
        assert len(sessions) == 1
        assert sessions[0].token_hash != body["access_token"]

    messages = [record.getMessage() for record in caplog.records]
    assert any("auth.register.succeeded" in message for message in messages)


@pytest.mark.parametrize(
    ("payload", "expected_message"),
    [
        (
            register_payload(username = "other_name"),
            "An account with that email already exists.",
        ),
        (
            register_payload(email = "other@example.com"),
            "That username is already in use.",
        ),
    ],
)
def test_register_rejects_duplicate_credentials(client, payload, expected_message):
    first = client.post("/api/auth/register", json = register_payload())
    assert first.status_code == 201

    second = client.post("/api/auth/register", json = payload)
    assert second.status_code == 409
    assert second.json()["error"]["message"] == expected_message


@pytest.mark.parametrize(
    "payload",
    [
        register_payload(email = "not-an-email"),
        register_payload(username = "NO"),
        register_payload(password = "short"),
    ],
)
def test_register_validates_invalid_payloads(client, payload):
    response = client.post("/api/auth/register", json = payload)

    assert response.status_code == 422
    assert response.json()["error"]["error_code"] == "VALIDATION_ERROR"


def test_login_creates_new_session_and_logs_success(client, session_factory, caplog):
    client.post("/api/auth/register", json = register_payload())

    caplog.set_level(logging.INFO, logger = "algo_explorer.services.auth")
    response = client.post(
        "/api/auth/login",
        json = {
            "email": "user@example.com",
            "password": "securePassword123",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["user"]["email"] == "user@example.com"
    assert body["access_token"]

    with session_factory() as db:
        assert db.query(AuthSession).count() == 2

    messages = [record.getMessage() for record in caplog.records]
    assert any("auth.login.succeeded" in message for message in messages)


@pytest.mark.parametrize(
    "payload",
    [
        {"email": "user@example.com", "password": "wrongPassword123"},
        {"email": "missing@example.com", "password": "securePassword123"},
    ],
)
def test_login_rejects_invalid_credentials_and_logs_failure(client, payload, caplog):
    client.post("/api/auth/register", json = register_payload())

    caplog.set_level(logging.WARNING, logger = "algo_explorer.services.auth")
    response = client.post("/api/auth/login", json = payload)

    assert response.status_code == 401
    assert response.json()["error"]["message"] == "Invalid email or password."
    assert any("auth.login.failed" in record.getMessage() for record in caplog.records)


def test_me_requires_a_valid_bearer_token(client):
    missing = client.get("/api/auth/me")
    assert missing.status_code == 401
    assert missing.json()["error"]["message"] == "Authentication required."

    invalid = client.get("/api/auth/me", headers = auth_headers("not-a-real-token"))
    assert invalid.status_code == 401
    assert invalid.json()["error"]["message"] == "Invalid or expired token."


def test_me_returns_current_user_for_active_session(client):
    register_response = client.post("/api/auth/register", json = register_payload())
    token = register_response.json()["access_token"]

    response = client.get("/api/auth/me", headers = auth_headers(token))

    assert response.status_code == 200
    assert response.json()["email"] == "user@example.com"
    assert response.json()["username"] == "andrew"


def test_logout_revokes_session_blocks_future_access_and_logs_success(client, session_factory, caplog):
    register_response = client.post("/api/auth/register", json = register_payload())
    token = register_response.json()["access_token"]

    caplog.set_level(logging.INFO, logger = "algo_explorer.services.auth")
    logout_response = client.post("/api/auth/logout", headers = auth_headers(token))

    assert logout_response.status_code == 200
    assert logout_response.json() == {"message": "Logged out."}

    me_response = client.get("/api/auth/me", headers = auth_headers(token))
    assert me_response.status_code == 401
    assert me_response.json()["error"]["message"] == "Invalid or expired token."

    with session_factory() as db:
        session = db.query(AuthSession).one()
        assert session.revoked_at is not None

    messages = [record.getMessage() for record in caplog.records]
    assert any("auth.logout.succeeded" in message for message in messages)
