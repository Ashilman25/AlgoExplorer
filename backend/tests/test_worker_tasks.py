import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.data.models import Base, BenchmarkJob


@pytest.fixture
def session_factory():
    engine = create_engine(
        "sqlite://",
        connect_args = {"check_same_thread": False},
        poolclass = StaticPool,
    )
    Base.metadata.create_all(bind = engine)
    TestingSessionLocal = sessionmaker(bind = engine)
    yield TestingSessionLocal
    Base.metadata.drop_all(bind = engine)
    engine.dispose()


def _create_pending_job(session_factory, config = None):
    db = session_factory()
    job = BenchmarkJob(
        module_type = "sorting",
        config = config or {
            "algorithm_keys": ["quicksort"],
            "input_family": "random",
            "sizes": [10],
            "trials_per_size": 1,
            "metrics": ["runtime_ms"],
        },
        status = "pending",
        progress = 0.0,
        summary = {},
        results = {},
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    job_id = job.id
    db.close()
    return job_id


def test_execute_benchmark_success(session_factory):
    job_id = _create_pending_job(session_factory)

    mock_result = {
        "series": {"runtime_ms": [{"algorithm_key": "quicksort", "points": []}]},
        "table": [{"algorithm_key": "quicksort", "size": 10, "runtime_mean": 0.1}],
        "summary": {
            "total_algorithms": 1,
            "total_sizes": 1,
            "trials_per_size": 1,
            "total_runs": 1,
            "input_family": "random",
            "elapsed_ms": 5.0,
        },
    }

    with patch("app.worker.tasks.run_benchmark", return_value = mock_result) as mock_run, \
         patch("app.worker.tasks.SessionLocal", session_factory):

        from app.worker.tasks import execute_benchmark
        execute_benchmark(job_id)

    db = session_factory()
    job = db.query(BenchmarkJob).filter(BenchmarkJob.id == job_id).first()

    assert job.status == "completed"
    assert job.progress == 1.0
    assert job.results["series"] == mock_result["series"]
    assert job.results["table"] == mock_result["table"]
    assert job.summary == mock_result["summary"]
    assert job.completed_at is not None
    db.close()


def test_execute_benchmark_failure(session_factory):
    job_id = _create_pending_job(session_factory)

    with patch("app.worker.tasks.run_benchmark", side_effect = RuntimeError("algo exploded")), \
         patch("app.worker.tasks.SessionLocal", session_factory):

        from app.worker.tasks import execute_benchmark
        execute_benchmark(job_id)

    db = session_factory()
    job = db.query(BenchmarkJob).filter(BenchmarkJob.id == job_id).first()

    assert job.status == "failed"
    assert job.completed_at is not None
    assert "algo exploded" in job.summary.get("error", "")
    db.close()


def test_execute_benchmark_sets_running_status(session_factory):
    job_id = _create_pending_job(session_factory)
    statuses_seen = []

    original_run = MagicMock(return_value = {
        "series": {},
        "table": [],
        "summary": {"total_algorithms": 1, "total_sizes": 1, "trials_per_size": 1, "total_runs": 1, "input_family": "random", "elapsed_ms": 1.0},
    })

    def capture_status_run(*args, **kwargs):
        db = session_factory()
        job = db.query(BenchmarkJob).filter(BenchmarkJob.id == job_id).first()
        statuses_seen.append(job.status)
        db.close()
        return original_run(*args, **kwargs)

    with patch("app.worker.tasks.run_benchmark", side_effect = capture_status_run), \
         patch("app.worker.tasks.SessionLocal", session_factory):

        from app.worker.tasks import execute_benchmark
        execute_benchmark(job_id)

    assert "running" in statuses_seen


def test_execute_benchmark_without_redis(session_factory, monkeypatch):
    job_id = _create_pending_job(session_factory)

    monkeypatch.setattr("app.worker.tasks.settings.use_redis", False)
    monkeypatch.setattr("app.worker.tasks.SessionLocal", session_factory)

    mock_result = {
        "series": {"runtime_ms": [{"algorithm_key": "quicksort", "points": []}]},
        "table": [],
        "summary": {
            "total_algorithms": 1,
            "total_sizes": 1,
            "trials_per_size": 1,
            "total_runs": 1,
            "input_family": "random",
            "elapsed_ms": 10.0,
            "cancelled": False,
        },
    }

    with patch("app.worker.tasks.run_benchmark", return_value = mock_result) as mock_bench:
        from app.worker.tasks import execute_benchmark
        execute_benchmark(job_id)

    # Verify redis_conn was passed as None
    call_kwargs = mock_bench.call_args
    assert call_kwargs.kwargs.get("redis_conn") is None or call_kwargs[1].get("redis_conn") is None
