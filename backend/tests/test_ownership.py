import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.main as main_module
from app.data.models import Base, SimulationRun, BenchmarkJob
from app.db import get_db
from app.main import app


# ── fixtures ──────────────────────────────────────────────────


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


def register_user(client, email, username, password = "securepass123"):
    resp = client.post("/api/auth/register", json = {
        "email": email,
        "username": username,
        "password": password,
    })
    assert resp.status_code == 201
    return resp.json()


def auth_header(token):
    return {"Authorization": f"Bearer {token}"}


SORTING_RUN_PAYLOAD = {
    "module_type": "sorting",
    "algorithm_key": "quicksort",
    "input_payload": {"array": [5, 3, 8, 1]},
    "execution_mode": "simulate",
    "explanation_level": "standard",
}

BENCHMARK_PAYLOAD = {
    "module_type": "sorting",
    "algorithm_keys": ["quicksort"],
    "input_family": "random",
    "sizes": [100],
    "trials_per_size": 1,
    "metrics": ["runtime_ms"],
}


# ── run ownership ─────────────────────────────────────────────


def test_guest_run_has_no_user_id(client, session_factory):
    resp = client.post("/api/runs/", json = SORTING_RUN_PAYLOAD)
    assert resp.status_code == 200
    run_id = resp.json()["id"]

    with session_factory() as db:
        run = db.query(SimulationRun).filter(SimulationRun.id == run_id).one()
        assert run.user_id is None


def test_authenticated_run_has_user_id(client, session_factory):
    auth = register_user(client, "owner@test.com", "owner")
    token = auth["access_token"]

    resp = client.post("/api/runs/", json = SORTING_RUN_PAYLOAD, headers = auth_header(token))
    assert resp.status_code == 200
    run_id = resp.json()["id"]

    with session_factory() as db:
        run = db.query(SimulationRun).filter(SimulationRun.id == run_id).one()
        assert run.user_id == auth["user"]["id"]


def test_owner_can_access_own_run(client):
    auth = register_user(client, "owner@test.com", "owner")
    token = auth["access_token"]

    run = client.post("/api/runs/", json = SORTING_RUN_PAYLOAD, headers = auth_header(token)).json()

    resp = client.get(f"/api/runs/{run['id']}", headers = auth_header(token))
    assert resp.status_code == 200

    resp = client.get(f"/api/runs/{run['id']}/timeline", headers = auth_header(token))
    assert resp.status_code == 200


def test_other_user_cannot_access_owned_run(client):
    owner = register_user(client, "owner@test.com", "owner")
    other = register_user(client, "other@test.com", "other")

    run = client.post("/api/runs/", json = SORTING_RUN_PAYLOAD, headers = auth_header(owner["access_token"])).json()

    resp = client.get(f"/api/runs/{run['id']}", headers = auth_header(other["access_token"]))
    assert resp.status_code == 403

    resp = client.get(f"/api/runs/{run['id']}/timeline", headers = auth_header(other["access_token"]))
    assert resp.status_code == 403


def test_guest_can_access_guest_run(client):
    run = client.post("/api/runs/", json = SORTING_RUN_PAYLOAD).json()

    resp = client.get(f"/api/runs/{run['id']}")
    assert resp.status_code == 200


def test_guest_cannot_access_owned_run(client):
    owner = register_user(client, "owner@test.com", "owner")
    run = client.post("/api/runs/", json = SORTING_RUN_PAYLOAD, headers = auth_header(owner["access_token"])).json()

    # No auth header = guest
    resp = client.get(f"/api/runs/{run['id']}")
    assert resp.status_code == 403


# ── benchmark ownership ───────────────────────────────────────


def test_guest_benchmark_has_no_user_id(client, session_factory):
    resp = client.post("/api/benchmarks/", json = BENCHMARK_PAYLOAD)
    assert resp.status_code == 200
    job_id = resp.json()["id"]

    with session_factory() as db:
        job = db.query(BenchmarkJob).filter(BenchmarkJob.id == job_id).one()
        assert job.user_id is None


def test_authenticated_benchmark_has_user_id(client, session_factory):
    auth = register_user(client, "owner@test.com", "owner")
    token = auth["access_token"]

    resp = client.post("/api/benchmarks/", json = BENCHMARK_PAYLOAD, headers = auth_header(token))
    assert resp.status_code == 200
    job_id = resp.json()["id"]

    with session_factory() as db:
        job = db.query(BenchmarkJob).filter(BenchmarkJob.id == job_id).one()
        assert job.user_id == auth["user"]["id"]


def test_benchmark_list_scoped_by_user(client):
    owner = register_user(client, "owner@test.com", "owner")
    other = register_user(client, "other@test.com", "other")

    # Guest creates a benchmark
    client.post("/api/benchmarks/", json = BENCHMARK_PAYLOAD)

    # Owner creates a benchmark
    client.post("/api/benchmarks/", json = BENCHMARK_PAYLOAD, headers = auth_header(owner["access_token"]))

    # Other creates a benchmark
    client.post("/api/benchmarks/", json = BENCHMARK_PAYLOAD, headers = auth_header(other["access_token"]))

    # Owner sees only their benchmark
    owner_list = client.get("/api/benchmarks/", headers = auth_header(owner["access_token"])).json()
    assert len(owner_list) == 1

    # Other sees only their benchmark
    other_list = client.get("/api/benchmarks/", headers = auth_header(other["access_token"])).json()
    assert len(other_list) == 1

    # Guest sees only the unowned benchmark
    guest_list = client.get("/api/benchmarks/").json()
    assert len(guest_list) == 1


def test_other_user_cannot_access_owned_benchmark(client):
    owner = register_user(client, "owner@test.com", "owner")
    other = register_user(client, "other@test.com", "other")

    job = client.post("/api/benchmarks/", json = BENCHMARK_PAYLOAD, headers = auth_header(owner["access_token"])).json()

    resp = client.get(f"/api/benchmarks/{job['id']}", headers = auth_header(other["access_token"]))
    assert resp.status_code == 403

    resp = client.get(f"/api/benchmarks/{job['id']}/results", headers = auth_header(other["access_token"]))
    assert resp.status_code == 403


# ── claim endpoint ────────────────────────────────────────────


def test_claim_reassigns_guest_resources(client, session_factory):
    # Create guest resources
    run = client.post("/api/runs/", json = SORTING_RUN_PAYLOAD).json()
    benchmark = client.post("/api/benchmarks/", json = BENCHMARK_PAYLOAD).json()

    # Register and claim
    auth = register_user(client, "claimer@test.com", "claimer")
    token = auth["access_token"]

    resp = client.post("/api/auth/claim", json = {
        "run_ids": [run["id"]],
        "benchmark_ids": [benchmark["id"]],
    }, headers = auth_header(token))

    assert resp.status_code == 200
    body = resp.json()
    assert body["runs_claimed"] == 1
    assert body["benchmarks_claimed"] == 1

    # Verify ownership in DB
    with session_factory() as db:
        claimed_run = db.query(SimulationRun).filter(SimulationRun.id == run["id"]).one()
        assert claimed_run.user_id == auth["user"]["id"]

        claimed_job = db.query(BenchmarkJob).filter(BenchmarkJob.id == benchmark["id"]).one()
        assert claimed_job.user_id == auth["user"]["id"]


def test_claim_ignores_already_owned_resources(client):
    owner = register_user(client, "owner@test.com", "owner")
    claimer = register_user(client, "claimer@test.com", "claimer")

    # Owner creates a run
    run = client.post("/api/runs/", json = SORTING_RUN_PAYLOAD, headers = auth_header(owner["access_token"])).json()

    # Claimer tries to claim the owned run
    resp = client.post("/api/auth/claim", json = {
        "run_ids": [run["id"]],
        "benchmark_ids": [],
    }, headers = auth_header(claimer["access_token"]))

    assert resp.status_code == 200
    assert resp.json()["runs_claimed"] == 0


def test_claim_requires_authentication(client):
    resp = client.post("/api/auth/claim", json = {"run_ids": [], "benchmark_ids": []})
    assert resp.status_code == 401


def test_claim_with_empty_ids_succeeds(client):
    auth = register_user(client, "user@test.com", "user")

    resp = client.post("/api/auth/claim", json = {
        "run_ids": [],
        "benchmark_ids": [],
    }, headers = auth_header(auth["access_token"]))

    assert resp.status_code == 200
    assert resp.json() == {"runs_claimed": 0, "benchmarks_claimed": 0}


def test_claim_with_nonexistent_ids_claims_zero(client):
    auth = register_user(client, "user@test.com", "user")

    resp = client.post("/api/auth/claim", json = {
        "run_ids": [9999],
        "benchmark_ids": [9999],
    }, headers = auth_header(auth["access_token"]))

    assert resp.status_code == 200
    assert resp.json()["runs_claimed"] == 0
    assert resp.json()["benchmarks_claimed"] == 0
