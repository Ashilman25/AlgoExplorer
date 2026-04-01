import re

import pytest

from app.exceptions import DomainError
from app.validators import validate_grid_payload


def _grid(rows, cols, walls = None):
    """Build a rows x cols grid with optional wall cells."""
    g = [[0] * cols for _ in range(rows)]
    for r, c in (walls or []):
        g[r][c] = 1
    return g


def _valid_payload(**overrides):
    """Return a minimal valid grid payload, with optional overrides."""
    base = {
        "grid": _grid(5, 5),
        "source": {"row": 0, "col": 0},
        "target": {"row": 4, "col": 4},
        "weighted": False,
        "allow_diagonal": False,
        "mode": "grid",
    }
    base.update(overrides)
    return base


# ── happy path ──────────────────────────────────────────────────────


def test_accepts_minimal_valid_grid():
    validate_grid_payload(_valid_payload())


def test_accepts_grid_with_walls():
    validate_grid_payload(
        _valid_payload(grid = _grid(5, 5, walls = [(1, 1), (2, 2), (3, 3)]))
    )


def test_accepts_grid_with_diagonal_enabled():
    validate_grid_payload(_valid_payload(allow_diagonal = True))


def test_accepts_max_size_grid():
    validate_grid_payload(
        _valid_payload(
            grid = _grid(50, 50),
            target = {"row": 49, "col": 49},
        )
    )


def test_accepts_non_square_min_size_grid():
    validate_grid_payload(
        _valid_payload(
            grid = _grid(5, 50),
            target = {"row": 4, "col": 49},
        )
    )


# ── Pydantic schema rejection ──────────────────────────────────────


def test_rejects_missing_grid_field():
    payload = _valid_payload()
    del payload["grid"]
    with pytest.raises(DomainError, match="grid"):
        validate_grid_payload(payload)


def test_rejects_missing_source_field():
    payload = _valid_payload()
    del payload["source"]
    with pytest.raises(DomainError, match="source"):
        validate_grid_payload(payload)


def test_rejects_extra_fields():
    with pytest.raises(DomainError, match="extra_stuff"):
        validate_grid_payload(_valid_payload(extra_stuff = "nope"))


# ── dimension rules ─────────────────────────────────────────────────


def test_rejects_too_few_rows():
    with pytest.raises(DomainError, match="between 5 and 50 rows"):
        validate_grid_payload(_valid_payload(grid = _grid(4, 5)))


def test_rejects_too_many_rows():
    with pytest.raises(DomainError, match="between 5 and 50 rows"):
        validate_grid_payload(
            _valid_payload(
                grid = _grid(51, 5),
                target = {"row": 50, "col": 4},
            )
        )


def test_rejects_too_few_cols():
    with pytest.raises(DomainError, match="between 5 and 50 columns"):
        validate_grid_payload(_valid_payload(grid = _grid(5, 4)))


def test_rejects_too_many_cols():
    with pytest.raises(DomainError, match="between 5 and 50 columns"):
        validate_grid_payload(_valid_payload(grid = _grid(5, 51)))


def test_rejects_non_rectangular_grid():
    grid = _grid(5, 5)
    grid.append([0, 0, 0])  # row 5 has 3 cols instead of 5
    with pytest.raises(DomainError, match="rectangular"):
        validate_grid_payload(_valid_payload(grid = grid))


# ── cell value rules ────────────────────────────────────────────────


def test_rejects_invalid_cell_value():
    grid = _grid(5, 5)
    grid[2][3] = 7
    with pytest.raises(DomainError, match=re.escape("[2][3]")):
        validate_grid_payload(_valid_payload(grid = grid))


# ── source/target bounds ────────────────────────────────────────────


def test_rejects_source_row_out_of_bounds():
    with pytest.raises(DomainError, match="Source.*out of bounds"):
        validate_grid_payload(_valid_payload(source = {"row": 99, "col": 0}))


def test_rejects_source_col_out_of_bounds():
    with pytest.raises(DomainError, match="Source.*out of bounds"):
        validate_grid_payload(_valid_payload(source = {"row": 0, "col": 99}))


def test_rejects_target_row_out_of_bounds():
    with pytest.raises(DomainError, match="Target.*out of bounds"):
        validate_grid_payload(_valid_payload(target = {"row": 99, "col": 0}))


def test_rejects_target_col_out_of_bounds():
    with pytest.raises(DomainError, match="Target.*out of bounds"):
        validate_grid_payload(_valid_payload(target = {"row": 0, "col": 99}))


def test_rejects_negative_source_coords():
    with pytest.raises(DomainError, match="Source.*out of bounds"):
        validate_grid_payload(_valid_payload(source = {"row": -1, "col": 0}))


def test_rejects_negative_target_coords():
    with pytest.raises(DomainError, match="Target.*out of bounds"):
        validate_grid_payload(_valid_payload(target = {"row": 0, "col": -1}))


# ── wall collision ──────────────────────────────────────────────────


def test_rejects_source_on_wall():
    grid = _grid(5, 5, walls = [(0, 0)])
    with pytest.raises(DomainError, match="Source cell is a wall"):
        validate_grid_payload(_valid_payload(grid = grid))


def test_rejects_target_on_wall():
    grid = _grid(5, 5, walls = [(4, 4)])
    with pytest.raises(DomainError, match="Target cell is a wall"):
        validate_grid_payload(_valid_payload(grid = grid))


# ── source == target ────────────────────────────────────────────────


def test_rejects_source_equals_target():
    with pytest.raises(DomainError, match="must be different"):
        validate_grid_payload(
            _valid_payload(
                source = {"row": 2, "col": 2},
                target = {"row": 2, "col": 2},
            )
        )


# ── orchestrator routing (integration) ──────────────────────────────

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


def _run_request(payload, algorithm_key = "bfs"):
    return {
        "module_type": "graph",
        "algorithm_key": algorithm_key,
        "input_payload": payload,
        "execution_mode": "simulate",
        "explanation_level": "standard",
    }


def test_orchestrator_routes_grid_payload_to_grid_validator(client):
    """Grid payload with invalid dimensions should get a grid-specific error,
    proving the orchestrator routed to validate_grid_payload, not validate_graph_payload."""
    payload = _valid_payload(grid = _grid(4, 5))
    resp = client.post("/api/runs/", json = _run_request(payload))
    assert resp.status_code == 400
    assert "between 5 and 50 rows" in resp.json()["error"]["message"]


def test_orchestrator_still_routes_graph_payload_to_graph_validator(client):
    """Regular graph payload (mode=graph) should still route to graph validation."""
    payload = {
        "nodes": [],
        "edges": [],
        "source": "A",
        "mode": "graph",
    }
    resp = client.post("/api/runs/", json = _run_request(payload))
    assert resp.status_code == 400
    assert "at least one node" in resp.json()["error"]["message"]


def test_orchestrator_routes_graph_payload_without_mode_to_graph_validator(client):
    """Graph payload with no mode key should still route to graph validation."""
    payload = {
        "nodes": [],
        "edges": [],
        "source": "A",
    }
    resp = client.post("/api/runs/", json = _run_request(payload))
    assert resp.status_code == 400
    assert "at least one node" in resp.json()["error"]["message"]


def test_orchestrator_rejects_grid_with_source_on_wall(client):
    """Full round-trip: grid payload where source is a wall cell."""
    grid = _grid(5, 5, walls = [(0, 0)])
    payload = _valid_payload(grid = grid)
    resp = client.post("/api/runs/", json = _run_request(payload))
    assert resp.status_code == 400
    assert "Source cell is a wall" in resp.json()["error"]["message"]
