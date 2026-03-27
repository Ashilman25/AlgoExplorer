"""
Tests for auth lifecycle, guest-to-account migration, and account-scoped
access to runs, benchmarks, and scenario-linked resources.
"""

import pytest
from unittest.mock import patch
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


# ── helpers ───────────────────────────────────────────────────


def register(client, email = "user@test.com", username = "testuser", password = "securepass123"):
    resp = client.post("/api/auth/register", json = {
        "email": email,
        "username": username,
        "password": password,
    })
    assert resp.status_code == 201
    return resp.json()


def login(client, email = "user@test.com", password = "securepass123"):
    resp = client.post("/api/auth/login", json = {"email": email, "password": password})
    assert resp.status_code == 200
    return resp.json()


def hdr(token):
    return {"Authorization": f"Bearer {token}"}


SORTING_RUN = {
    "module_type": "sorting",
    "algorithm_key": "quicksort",
    "input_payload": {"array": [5, 3, 8, 1]},
    "execution_mode": "simulate",
    "explanation_level": "standard",
}

BENCHMARK = {
    "module_type": "sorting",
    "algorithm_keys": ["quicksort"],
    "input_family": "random",
    "sizes": [100],
    "trials_per_size": 1,
    "metrics": ["runtime_ms"],
}


def create_guest_run(client, **overrides):
    payload = {**SORTING_RUN, **overrides}
    resp = client.post("/api/runs/", json = payload)
    assert resp.status_code == 200
    return resp.json()


def create_guest_benchmark(client):
    with patch("app.routes.benchmarks.enqueue_benchmark"):
        resp = client.post("/api/benchmarks/", json = BENCHMARK)
    assert resp.status_code == 200
    return resp.json()


# ── 1. signup / login / logout lifecycle ──────────────────────


def test_full_auth_lifecycle_register_logout_relogin(client):
    auth = register(client)
    token = auth["access_token"]

    # authenticated /me works
    assert client.get("/api/auth/me", headers = hdr(token)).status_code == 200

    # logout
    assert client.post("/api/auth/logout", headers = hdr(token)).status_code == 200

    # old token is now revoked
    assert client.get("/api/auth/me", headers = hdr(token)).status_code == 401

    # re-login with same credentials produces a fresh session
    new_auth = login(client)
    new_token = new_auth["access_token"]
    assert new_token != token

    me = client.get("/api/auth/me", headers = hdr(new_token)).json()
    assert me["email"] == "user@test.com"


def test_multiple_sessions_are_independent(client):
    register(client)
    session_a = login(client)
    session_b = login(client)

    # both sessions valid
    assert client.get("/api/auth/me", headers = hdr(session_a["access_token"])).status_code == 200
    assert client.get("/api/auth/me", headers = hdr(session_b["access_token"])).status_code == 200

    # revoke session A
    client.post("/api/auth/logout", headers = hdr(session_a["access_token"]))

    # A is dead, B still alive
    assert client.get("/api/auth/me", headers = hdr(session_a["access_token"])).status_code == 401
    assert client.get("/api/auth/me", headers = hdr(session_b["access_token"])).status_code == 200


def test_logout_is_idempotent_revoked_token_returns_401(client):
    auth = register(client)
    token = auth["access_token"]

    client.post("/api/auth/logout", headers = hdr(token))

    # second logout attempt with revoked token
    resp = client.post("/api/auth/logout", headers = hdr(token))
    assert resp.status_code == 401


# ── 2. guest data import into a new account ───────────────────


def test_guest_to_account_migration_full_lifecycle(client, session_factory):
    # guest creates resources
    guest_run_1 = create_guest_run(client)
    guest_run_2 = create_guest_run(client, algorithm_key = "mergesort")
    guest_bench = create_guest_benchmark(client)

    # verify guest can access them
    assert client.get(f"/api/runs/{guest_run_1['id']}").status_code == 200
    assert client.get(f"/api/runs/{guest_run_2['id']}").status_code == 200
    assert client.get(f"/api/benchmarks/{guest_bench['id']}").status_code == 200

    # register a new account and claim the guest data
    auth = register(client)
    token = auth["access_token"]

    claim = client.post("/api/auth/claim", json = {
        "run_ids": [guest_run_1["id"], guest_run_2["id"]],
        "benchmark_ids": [guest_bench["id"]],
    }, headers = hdr(token))

    assert claim.status_code == 200
    assert claim.json()["runs_claimed"] == 2
    assert claim.json()["benchmarks_claimed"] == 1

    # owner can still access everything
    assert client.get(f"/api/runs/{guest_run_1['id']}", headers = hdr(token)).status_code == 200
    assert client.get(f"/api/runs/{guest_run_2['id']}", headers = hdr(token)).status_code == 200
    assert client.get(f"/api/benchmarks/{guest_bench['id']}", headers = hdr(token)).status_code == 200

    # guest can NO LONGER access claimed resources
    assert client.get(f"/api/runs/{guest_run_1['id']}").status_code == 403
    assert client.get(f"/api/runs/{guest_run_2['id']}").status_code == 403
    assert client.get(f"/api/benchmarks/{guest_bench['id']}").status_code == 403


def test_claimed_runs_appear_in_owner_run_history(client):
    guest_run = create_guest_run(client)

    auth = register(client)
    token = auth["access_token"]

    # owner has no run history yet
    assert client.get("/api/runs/", headers = hdr(token)).json() == []

    # claim
    client.post("/api/auth/claim", json = {
        "run_ids": [guest_run["id"]],
        "benchmark_ids": [],
    }, headers = hdr(token))

    # now it appears in the owner's run list
    runs = client.get("/api/runs/", headers = hdr(token)).json()
    assert len(runs) == 1
    assert runs[0]["id"] == guest_run["id"]


def test_claimed_benchmarks_appear_in_owner_benchmark_list(client):
    guest_bench = create_guest_benchmark(client)

    auth = register(client)
    token = auth["access_token"]

    assert client.get("/api/benchmarks/", headers = hdr(token)).json() == []

    client.post("/api/auth/claim", json = {
        "run_ids": [],
        "benchmark_ids": [guest_bench["id"]],
    }, headers = hdr(token))

    benchmarks = client.get("/api/benchmarks/", headers = hdr(token)).json()
    assert len(benchmarks) == 1
    assert benchmarks[0]["id"] == guest_bench["id"]


def test_double_claim_does_not_duplicate(client):
    guest_run = create_guest_run(client)

    auth = register(client)
    token = auth["access_token"]

    # first claim succeeds
    first = client.post("/api/auth/claim", json = {
        "run_ids": [guest_run["id"]],
        "benchmark_ids": [],
    }, headers = hdr(token)).json()
    assert first["runs_claimed"] == 1

    # second claim of the same ID is a no-op (already owned)
    second = client.post("/api/auth/claim", json = {
        "run_ids": [guest_run["id"]],
        "benchmark_ids": [],
    }, headers = hdr(token)).json()
    assert second["runs_claimed"] == 0


# ── 3. account-scoped scenario access ────────────────────────


def test_run_with_scenario_id_is_scoped_to_owner(client):
    owner = register(client, "owner@test.com", "owner")
    other = register(client, "other@test.com", "other")

    run = client.post("/api/runs/", json = {**SORTING_RUN, "scenario_id": 42},
                      headers = hdr(owner["access_token"])).json()

    # owner can access
    assert client.get(f"/api/runs/{run['id']}", headers = hdr(owner["access_token"])).status_code == 200
    assert client.get(f"/api/runs/{run['id']}/timeline", headers = hdr(owner["access_token"])).status_code == 200

    # other user cannot
    assert client.get(f"/api/runs/{run['id']}", headers = hdr(other["access_token"])).status_code == 403
    assert client.get(f"/api/runs/{run['id']}/timeline", headers = hdr(other["access_token"])).status_code == 403

    # guest cannot
    assert client.get(f"/api/runs/{run['id']}").status_code == 403


def test_guest_scenario_run_accessible_without_auth(client):
    run = client.post("/api/runs/", json = {**SORTING_RUN, "scenario_id": 7}).json()

    assert client.get(f"/api/runs/{run['id']}").status_code == 200
    assert client.get(f"/api/runs/{run['id']}/timeline").status_code == 200


def test_claimed_scenario_runs_transfer_to_owner(client, session_factory):
    # guest creates a scenario-linked run
    guest_run = client.post("/api/runs/", json = {**SORTING_RUN, "scenario_id": 99}).json()

    auth = register(client)
    token = auth["access_token"]

    client.post("/api/auth/claim", json = {
        "run_ids": [guest_run["id"]],
        "benchmark_ids": [],
    }, headers = hdr(token))

    # verify ownership transferred and scenario_id preserved
    with session_factory() as db:
        run = db.query(SimulationRun).filter(SimulationRun.id == guest_run["id"]).one()
        assert run.user_id == auth["user"]["id"]
        assert run.scenario_id == 99

    # owner can access
    assert client.get(f"/api/runs/{guest_run['id']}", headers = hdr(token)).status_code == 200

    # guest can no longer access
    assert client.get(f"/api/runs/{guest_run['id']}").status_code == 403


def test_scenario_runs_appear_in_scoped_run_history(client):
    owner = register(client, "owner@test.com", "owner")
    token = owner["access_token"]

    # create runs with different scenario IDs
    run_a = client.post("/api/runs/", json = {**SORTING_RUN, "scenario_id": 1}, headers = hdr(token)).json()
    run_b = client.post("/api/runs/", json = {**SORTING_RUN, "scenario_id": 2}, headers = hdr(token)).json()
    run_c = client.post("/api/runs/", json = SORTING_RUN, headers = hdr(token)).json()

    # another user creates a scenario run (should not appear)
    other = register(client, "other@test.com", "other")
    client.post("/api/runs/", json = {**SORTING_RUN, "scenario_id": 1}, headers = hdr(other["access_token"]))

    owner_runs = client.get("/api/runs/", headers = hdr(token)).json()
    owner_run_ids = {r["id"] for r in owner_runs}

    assert run_a["id"] in owner_run_ids
    assert run_b["id"] in owner_run_ids
    assert run_c["id"] in owner_run_ids
    assert len(owner_runs) == 3


# ── 4. account-scoped run history access ──────────────────────


def test_run_list_scoped_by_user(client):
    owner = register(client, "owner@test.com", "owner")
    other = register(client, "other@test.com", "other")

    # guest, owner, and other each create a run
    create_guest_run(client)
    client.post("/api/runs/", json = SORTING_RUN, headers = hdr(owner["access_token"]))
    client.post("/api/runs/", json = SORTING_RUN, headers = hdr(other["access_token"]))

    # each sees only their own
    assert len(client.get("/api/runs/", headers = hdr(owner["access_token"])).json()) == 1
    assert len(client.get("/api/runs/", headers = hdr(other["access_token"])).json()) == 1
    assert len(client.get("/api/runs/").json()) == 1  # guest sees unowned


def test_run_list_returns_empty_for_new_user(client):
    auth = register(client)
    runs = client.get("/api/runs/", headers = hdr(auth["access_token"])).json()
    assert runs == []


def test_run_list_ordered_most_recent_first(client):
    auth = register(client)
    token = auth["access_token"]

    first = client.post("/api/runs/", json = SORTING_RUN, headers = hdr(token)).json()
    second = client.post("/api/runs/", json = {**SORTING_RUN, "algorithm_key": "mergesort"}, headers = hdr(token)).json()

    runs = client.get("/api/runs/", headers = hdr(token)).json()
    assert runs[0]["id"] == second["id"]
    assert runs[1]["id"] == first["id"]


def test_authenticated_run_not_visible_in_guest_list(client):
    auth = register(client)
    client.post("/api/runs/", json = SORTING_RUN, headers = hdr(auth["access_token"]))

    guest_list = client.get("/api/runs/").json()
    assert guest_list == []
