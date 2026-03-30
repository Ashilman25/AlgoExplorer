import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.middleware import SecurityHeadersMiddleware


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
