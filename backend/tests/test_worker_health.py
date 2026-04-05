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


def test_worker_health_with_active_workers(client):
    mock_worker = MagicMock()
    mock_worker.name = "worker-1"
    mock_worker.state = "busy"

    mock_queue = MagicMock()
    mock_queue.count = 3

    mock_failed = MagicMock()
    mock_failed.count = 1

    with patch("app.worker.health.Worker.all", return_value = [mock_worker]), \
         patch("app.worker.health.Queue", return_value = mock_queue), \
         patch("app.worker.health.get_failed_queue", return_value = mock_failed):

        resp = client.get("/api/benchmarks/workers/health")

    assert resp.status_code == 200
    data = resp.json()
    assert data["healthy"] is True
    assert data["workers"]["active"] == 1
    assert data["queue"]["pending"] == 3
    assert data["queue"]["failed"] == 1


def test_worker_health_no_workers(client):
    mock_queue = MagicMock()
    mock_queue.count = 0

    mock_failed = MagicMock()
    mock_failed.count = 0

    with patch("app.worker.health.Worker.all", return_value = []), \
         patch("app.worker.health.Queue", return_value = mock_queue), \
         patch("app.worker.health.get_failed_queue", return_value = mock_failed):

        resp = client.get("/api/benchmarks/workers/health")

    assert resp.status_code == 200
    data = resp.json()
    assert data["healthy"] is False
    assert data["workers"]["active"] == 0
    assert data["workers"]["idle"] == 0


def test_worker_health_redis_unavailable(client):
    with patch("app.worker.health.Worker.all", side_effect = Exception("Redis down")), \
         patch("app.worker.health.Queue", side_effect = Exception("Redis down")), \
         patch("app.worker.health.get_failed_queue", side_effect = Exception("Redis down")):

        resp = client.get("/api/benchmarks/workers/health")

    assert resp.status_code == 200
    data = resp.json()
    assert data["healthy"] is False
    assert data["workers"]["active"] == 0
    assert data["queue"]["pending"] == 0


def test_worker_health_redis_disabled(client, monkeypatch):
    monkeypatch.setattr("app.worker.health.settings.use_redis", False)
    resp = client.get("/api/benchmarks/workers/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["healthy"] is False
    assert data["workers"]["active"] == 0
    assert data["queue"]["pending"] == 0
    assert data["queue"]["failed"] == 0


def test_create_benchmark_returns_pending(client):
    with patch("app.routes.benchmarks.enqueue_benchmark") as mock_enqueue:
        resp = client.post("/api/benchmarks/", json = {
            "module_type": "sorting",
            "algorithm_keys": ["quicksort"],
            "input_family": "random",
            "sizes": [10, 50],
            "trials_per_size": 3,
            "metrics": ["runtime_ms"],
        })

    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "pending"
    assert data["progress"] == 0.0
    mock_enqueue.assert_called_once_with(data["id"])


def test_create_benchmark_returns_pending_without_results(client):
    with patch("app.routes.benchmarks.enqueue_benchmark"):
        create_resp = client.post("/api/benchmarks/", json = {
            "module_type": "sorting",
            "algorithm_keys": ["quicksort"],
            "input_family": "random",
            "sizes": [10],
            "trials_per_size": 1,
            "metrics": ["runtime_ms"],
        })

    job_id = create_resp.json()["id"]
    results_resp = client.get(f"/api/benchmarks/{job_id}/results")

    assert results_resp.status_code == 200
    data = results_resp.json()
    assert data["status"] == "pending"
    assert data["series"] == {}
    assert data["table"] == []
