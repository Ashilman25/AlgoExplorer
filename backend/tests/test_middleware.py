import logging

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from fastapi.middleware.cors import CORSMiddleware

from app.middleware import SecurityHeadersMiddleware
from app.config import settings
from app.main import app as main_app
import app.main as main_module


def make_app(enforce_https = False):
    test_app = FastAPI()
    test_app.add_middleware(SecurityHeadersMiddleware, enforce_https = enforce_https)

    @test_app.get("/api/health")
    def health():
        return {"status": "ok"}

    return test_app


@pytest.fixture
def client():
    return TestClient(make_app(enforce_https = False))


def test_unconditional_security_headers_present(client):
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"
    assert response.headers["X-XSS-Protection"] == "0"
    assert response.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"
    assert response.headers["Permissions-Policy"] == "camera=(), microphone=(), geolocation=(), payment=()"


def test_hsts_absent_when_enforce_https_disabled(client):
    response = client.get("/api/health")

    assert "Strict-Transport-Security" not in response.headers


def test_hsts_present_when_enforce_https_enabled():
    app = make_app(enforce_https = True)
    client = TestClient(app, base_url = "https://testserver")

    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.headers["Strict-Transport-Security"] == "max-age=63072000; includeSubDomains; preload"


def test_http_redirects_to_https_when_enforced():
    app = make_app(enforce_https = True)
    client = TestClient(app, base_url = "http://testserver")

    response = client.get("/api/health", follow_redirects = False)

    assert response.status_code == 301
    assert response.headers["location"].startswith("https://")


def test_https_redirect_preserves_path_and_query():
    app = make_app(enforce_https = True)
    client = TestClient(app, base_url = "http://testserver")

    response = client.get("/api/health?verbose=true&limit=10", follow_redirects = False)

    assert response.status_code == 301
    location = response.headers["location"]
    assert location == "https://testserver/api/health?verbose=true&limit=10"


def make_cors_app():
    cors_app = FastAPI()
    cors_app.add_middleware(
        CORSMiddleware,
        allow_origins = ["http://localhost:5173"],
        allow_credentials = True,
        allow_methods = ["GET", "POST", "PATCH", "OPTIONS"],
        allow_headers = ["Content-Type", "Authorization"],
    )

    @cors_app.post("/api/test")
    def test_post():
        return {"status": "ok"}

    return cors_app


def test_cors_allows_valid_preflight():
    app = make_cors_app()
    client = TestClient(app)

    response = client.options(
        "/api/test",
        headers = {
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type",
        },
    )

    assert response.status_code == 200
    assert "POST" in response.headers["access-control-allow-methods"]
    assert "Content-Type" in response.headers["access-control-allow-headers"]


def test_cors_rejects_disallowed_method():
    app = make_cors_app()
    client = TestClient(app)

    response = client.options(
        "/api/test",
        headers = {
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "DELETE",
        },
    )

    assert response.status_code == 400


def test_production_warns_on_localhost_cors_origins(monkeypatch, caplog):
    monkeypatch.setattr(main_module, "init_db", lambda: None)
    monkeypatch.setattr(settings, "env", "production")

    with caplog.at_level(logging.WARNING, logger = "algo_explorer.main"):
        with TestClient(main_app):
            pass

    assert any("cors.localhost_origins_in_production" in r.message for r in caplog.records)


def test_no_localhost_warning_in_development(monkeypatch, caplog):
    monkeypatch.setattr(main_module, "init_db", lambda: None)
    monkeypatch.setattr(settings, "env", "development")

    with caplog.at_level(logging.WARNING, logger = "algo_explorer.main"):
        with TestClient(main_app):
            pass

    assert not any("cors.localhost_origins_in_production" in r.message for r in caplog.records)
