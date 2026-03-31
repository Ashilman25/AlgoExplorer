import re
import pytest
from pydantic import ValidationError

from app.schemas.benchmarks import CreateBenchmarkRequest


def _base_sorting(**overrides):
    defaults = {
        "module_type": "sorting",
        "algorithm_keys": ["quicksort"],
        "input_family": "random",
        "sizes": [100],
        "metrics": ["runtime_ms"],
    }
    defaults.update(overrides)
    return defaults


def _base_graph(category, **overrides):
    defaults = {
        "module_type": "graph",
        "category": category,
        "algorithm_keys": ["bfs"],
        "input_family": "sparse_random",
        "sizes": [100],
        "metrics": ["runtime_ms"],
    }
    defaults.update(overrides)
    return defaults


# --- category requirement / rejection ---

def test_graph_requires_category():
    payload = {
        "module_type": "graph",
        "algorithm_keys": ["bfs"],
        "input_family": "sparse_random",
        "sizes": [100],
        "metrics": ["runtime_ms"],
    }
    with pytest.raises(ValidationError, match = re.compile(r"category.*required.*graph", re.IGNORECASE)):
        CreateBenchmarkRequest(**payload)


def test_sorting_rejects_category():
    with pytest.raises(ValidationError, match = re.compile(r"category.*not.*sorting", re.IGNORECASE)):
        CreateBenchmarkRequest(**_base_sorting(category = "traversal"))


def test_sorting_without_category_still_works():
    req = CreateBenchmarkRequest(**_base_sorting())
    assert req.module_type == "sorting"
    assert req.category is None


# --- algorithm / category matching ---

def test_graph_algorithm_must_match_category():
    with pytest.raises(ValidationError, match = re.compile(r"not supported.*traversal", re.IGNORECASE)):
        CreateBenchmarkRequest(**_base_graph(
            "traversal",
            algorithm_keys = ["dijkstra"],
        ))


def test_valid_traversal_request():
    req = CreateBenchmarkRequest(**_base_graph(
        "traversal",
        algorithm_keys = ["bfs", "dfs"],
        input_family = "sparse_random",
        metrics = ["nodes_visited"],
    ))
    assert req.category == "traversal"


def test_valid_shortest_path_request():
    req = CreateBenchmarkRequest(**_base_graph(
        "shortest_path",
        algorithm_keys = ["dijkstra", "astar"],
        input_family = "grid",
        metrics = ["relaxations"],
    ))
    assert req.category == "shortest_path"


def test_valid_mst_request():
    req = CreateBenchmarkRequest(**_base_graph(
        "mst",
        algorithm_keys = ["prims", "kruskals"],
        input_family = "sparse_random",
        metrics = ["edges_added"],
    ))
    assert req.category == "mst"


def test_valid_ordering_request():
    req = CreateBenchmarkRequest(**_base_graph(
        "ordering",
        algorithm_keys = ["topological_sort"],
        input_family = "chain",
        metrics = ["nodes_ordered"],
    ))
    assert req.category == "ordering"


# --- family / category matching ---

def test_graph_family_must_match_category():
    with pytest.raises(ValidationError, match = re.compile(r"not supported.*traversal", re.IGNORECASE)):
        CreateBenchmarkRequest(**_base_graph(
            "traversal",
            input_family = "chain",
        ))


def test_ordering_rejects_grid():
    with pytest.raises(ValidationError, match = re.compile(r"not supported.*ordering", re.IGNORECASE)):
        CreateBenchmarkRequest(**_base_graph(
            "ordering",
            algorithm_keys = ["topological_sort"],
            input_family = "grid",
            metrics = ["nodes_ordered"],
        ))


# --- metric / category matching ---

def test_graph_metric_must_match_category():
    with pytest.raises(ValidationError, match = re.compile(r"not supported.*traversal", re.IGNORECASE)):
        CreateBenchmarkRequest(**_base_graph(
            "traversal",
            metrics = ["relaxations"],
        ))


# --- size limits ---

def test_complete_graph_rejects_large_size():
    with pytest.raises(ValidationError, match = re.compile(r"exceeds maximum.*500", re.IGNORECASE)):
        CreateBenchmarkRequest(**_base_graph(
            "mst",
            algorithm_keys = ["prims"],
            input_family = "complete",
            sizes = [600],
            metrics = ["runtime_ms"],
        ))


def test_grid_rejects_non_square():
    with pytest.raises(ValidationError, match = re.compile(r"perfect square", re.IGNORECASE)):
        CreateBenchmarkRequest(**_base_graph(
            "traversal",
            input_family = "grid",
            sizes = [10],
            metrics = ["runtime_ms"],
        ))


def test_grid_accepts_perfect_squares():
    for size in [9, 25, 100]:
        req = CreateBenchmarkRequest(**_base_graph(
            "traversal",
            input_family = "grid",
            sizes = [size],
            metrics = ["runtime_ms"],
        ))
        assert size in req.sizes


# --- invalid category key ---

def test_invalid_category_key():
    with pytest.raises(ValidationError, match = re.compile(r"not a valid category", re.IGNORECASE)):
        CreateBenchmarkRequest(**_base_graph("invalid_cat"))
