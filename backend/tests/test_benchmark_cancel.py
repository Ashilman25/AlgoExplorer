import pytest
from unittest.mock import patch, MagicMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db import get_db
from app.data.models import Base, BenchmarkJob
from fastapi.testclient import TestClient


@pytest.fixture
def session_factory(monkeypatch):
    engine = create_engine("sqlite://", connect_args = {"check_same_thread": False}, poolclass = StaticPool)
    import app.main as main_module
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


def _create_job(session_factory, status = "running"):
    db = session_factory()
    job = BenchmarkJob(
        module_type = "sorting",
        config = {"algorithm_keys": ["quicksort"], "sizes": [10], "trials_per_size": 1, "metrics": ["runtime_ms"], "input_family": "random"},
        status = status,
        progress = 0.5,
        summary = {},
        results = {},
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    job_id = job.id
    db.close()
    return job_id


@patch("app.routes.benchmarks.get_redis")
def test_cancel_running_job(mock_get_redis, client, session_factory):
    mock_redis = MagicMock()
    mock_get_redis.return_value = mock_redis

    job_id = _create_job(session_factory, status = "running")
    resp = client.post(f"/api/benchmarks/{job_id}/cancel")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "cancelling"
    mock_redis.set.assert_called_once_with(f"benchmark:{job_id}:cancel", "1", ex = 3600)


@patch("app.routes.benchmarks.get_redis")
def test_cancel_pending_job(mock_get_redis, client, session_factory):
    mock_redis = MagicMock()
    mock_get_redis.return_value = mock_redis

    job_id = _create_job(session_factory, status = "pending")
    resp = client.post(f"/api/benchmarks/{job_id}/cancel")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "cancelled"
    mock_redis.set.assert_called_once_with(f"benchmark:{job_id}:cancel", "1", ex = 3600)


def test_cancel_nonexistent_job(client):
    resp = client.post("/api/benchmarks/99999/cancel")
    assert resp.status_code == 404


@patch("app.routes.benchmarks.get_redis")
def test_cancel_completed_job_is_noop(mock_get_redis, client, session_factory):
    mock_redis = MagicMock()
    mock_get_redis.return_value = mock_redis

    job_id = _create_job(session_factory, status = "completed")
    resp = client.post(f"/api/benchmarks/{job_id}/cancel")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "completed"
    mock_redis.set.assert_not_called()
