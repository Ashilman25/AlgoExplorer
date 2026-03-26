import pytest
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


def register_and_get_token(client):
    resp = client.post("/api/auth/register", json = {
        "email": "user@test.com",
        "username": "testuser",
        "password": "securepass123",
    })
    assert resp.status_code == 201
    return resp.json()["access_token"]


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}


# ── settings update ───────────────────────────────────────────


def test_update_single_setting(client):
    token = register_and_get_token(client)

    resp = client.patch("/api/auth/settings", json = {"theme": "light"}, headers = auth_header(token))
    assert resp.status_code == 200

    settings = resp.json()["settings"]
    assert settings["theme"] == "light"
    # Other defaults preserved
    assert settings["default_playback_speed"] == 1.0
    assert settings["explanation_verbosity"] == "standard"


def test_update_multiple_settings(client):
    token = register_and_get_token(client)

    resp = client.patch("/api/auth/settings", json = {
        "theme": "light",
        "default_playback_speed": 2.0,
        "explanation_verbosity": "detailed",
        "animation_detail": "full",
    }, headers = auth_header(token))
    assert resp.status_code == 200

    settings = resp.json()["settings"]
    assert settings["theme"] == "light"
    assert settings["default_playback_speed"] == 2.0
    assert settings["explanation_verbosity"] == "detailed"
    assert settings["animation_detail"] == "full"


def test_update_chart_preferences_partial(client):
    token = register_and_get_token(client)

    # Update only show_grid
    resp = client.patch("/api/auth/settings", json = {
        "chart_preferences": {"show_grid": False},
    }, headers = auth_header(token))
    assert resp.status_code == 200

    chart = resp.json()["settings"]["chart_preferences"]
    assert chart["show_grid"] is False
    # Other chart defaults preserved
    assert chart["show_legend"] is True
    assert chart["color_scheme"] == "default"


def test_update_chart_color_scheme(client):
    token = register_and_get_token(client)

    resp = client.patch("/api/auth/settings", json = {
        "chart_preferences": {"color_scheme": "colorblind"},
    }, headers = auth_header(token))
    assert resp.status_code == 200
    assert resp.json()["settings"]["chart_preferences"]["color_scheme"] == "colorblind"


def test_settings_persist_across_requests(client):
    token = register_and_get_token(client)

    client.patch("/api/auth/settings", json = {"theme": "light"}, headers = auth_header(token))

    me = client.get("/api/auth/me", headers = auth_header(token)).json()
    assert me["settings"]["theme"] == "light"


def test_playback_speed_validates_range(client):
    token = register_and_get_token(client)

    resp = client.patch("/api/auth/settings", json = {"default_playback_speed": 10.0}, headers = auth_header(token))
    assert resp.status_code == 422

    resp = client.patch("/api/auth/settings", json = {"default_playback_speed": 0.1}, headers = auth_header(token))
    assert resp.status_code == 422


def test_invalid_theme_value_rejected(client):
    token = register_and_get_token(client)

    resp = client.patch("/api/auth/settings", json = {"theme": "neon"}, headers = auth_header(token))
    assert resp.status_code == 422


def test_invalid_verbosity_rejected(client):
    token = register_and_get_token(client)

    resp = client.patch("/api/auth/settings", json = {"explanation_verbosity": "verbose"}, headers = auth_header(token))
    assert resp.status_code == 422


def test_extra_fields_rejected(client):
    token = register_and_get_token(client)

    resp = client.patch("/api/auth/settings", json = {"unknown_pref": True}, headers = auth_header(token))
    assert resp.status_code == 422


def test_settings_requires_auth(client):
    resp = client.patch("/api/auth/settings", json = {"theme": "light"})
    assert resp.status_code == 401


def test_empty_update_preserves_all(client):
    token = register_and_get_token(client)

    resp = client.patch("/api/auth/settings", json = {}, headers = auth_header(token))
    assert resp.status_code == 200

    settings = resp.json()["settings"]
    assert settings["theme"] == "dark"
    assert settings["default_playback_speed"] == 1.0


def test_new_account_has_chart_preferences_defaults(client):
    token = register_and_get_token(client)

    me = client.get("/api/auth/me", headers = auth_header(token)).json()
    chart = me["settings"]["chart_preferences"]
    assert chart["show_grid"] is True
    assert chart["show_legend"] is True
    assert chart["color_scheme"] == "default"
