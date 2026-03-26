from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.main as main_module
from app.data.models import Base
from app.db import get_db
from app.exceptions import DomainError
from app.main import app
from app.persistence import decode_timeline_payload, encode_timeline_payload, safe_json_value


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


def test_safe_json_value_normalizes_supported_types():
    payload = {
        "created_at": datetime(2026, 3, 26, 12, 30, 0),
        "items": (1, 2, 3),
        "flags": {"b", "a"},
    }

    normalized = safe_json_value(payload, label = "test payload")

    assert normalized["created_at"] == "2026-03-26T12:30:00"
    assert normalized["items"] == [1, 2, 3]
    assert normalized["flags"] == ["a", "b"]


def test_safe_json_value_rejects_non_finite_numbers():
    with pytest.raises(DomainError):
        safe_json_value({"runtime_ms": float("nan")}, label = "summary")


def test_encode_timeline_payload_can_compress(monkeypatch):
    monkeypatch.setattr("app.persistence.TIMELINE_COMPRESSION_THRESHOLD_BYTES", 1)

    payload = encode_timeline_payload([
        {"step_index": 0, "event_type": "initialize", "state_payload": {"array": [5, 4, 3, 2, 1]}},
        {"step_index": 1, "event_type": "complete", "state_payload": {"array": [1, 2, 3, 4, 5]}},
    ])

    assert payload["encoding"] == "gzip+base64+json"
    assert payload["step_count"] == 2
    assert decode_timeline_payload(payload)[1]["event_type"] == "complete"


def test_decode_timeline_payload_supports_legacy_inline_lists():
    legacy = [
        {"step_index": 0, "event_type": "INITIALIZE", "state_payload": {"queue": ["A"]}},
        {"step_index": 1, "event_type": "COMPLETE", "state_payload": {"queue": []}},
    ]

    decoded = decode_timeline_payload(legacy)

    assert decoded == legacy


def test_compressed_timeline_storage_round_trips_through_run_route(client, monkeypatch):
    monkeypatch.setattr("app.persistence.TIMELINE_COMPRESSION_THRESHOLD_BYTES", 1)

    create_resp = client.post(
        "/api/runs/",
        json = {
            "module_type": "sorting",
            "algorithm_key": "quicksort",
            "input_payload": {"array": [9, 4, 7, 2, 5, 1]},
            "execution_mode": "simulate",
            "explanation_level": "standard",
        },
    )

    assert create_resp.status_code == 200
    run = create_resp.json()

    timeline_resp = client.get(f"/api/runs/{run['id']}/timeline")
    assert timeline_resp.status_code == 200

    payload = timeline_resp.json()
    assert payload["run_id"] == run["id"]
    assert payload["total_steps"] > 0
    assert payload["steps"][0]["event_type"]
