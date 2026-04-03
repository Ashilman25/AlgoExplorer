import random

import pytest

from app.benchmark.graph_inputs import (
    generate_graph_input,
    parse_benchmark_graph,
    BenchmarkGraphData,
)
from app.schemas.payloads import GraphInputPayload


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _pydantic_extract(raw):
    """Extract fields the same way algorithms currently do via Pydantic."""
    gip = GraphInputPayload.model_validate(raw)
    node_ids = [str(n.id) for n in gip.nodes]
    source = str(gip.source) if gip.source is not None else None
    target = str(gip.target) if gip.target is not None else None
    edges = []
    for e in gip.edges:
        w = e.weight if e.weight is not None else 1.0
        edges.append((str(e.source), str(e.target), float(w)))
    coords = None
    if gip.nodes and gip.nodes[0].x is not None:
        coords = {str(n.id): (n.x, n.y) for n in gip.nodes}
    return node_ids, source, target, gip.directed, gip.weighted, edges, coords


# ---------------------------------------------------------------------------
# Basic extraction
# ---------------------------------------------------------------------------

class TestParseBenchmarkGraph:
    def test_returns_dataclass(self):
        raw = generate_graph_input("sparse_random", 20, "traversal", ["bfs"])
        bg = parse_benchmark_graph(raw)
        assert isinstance(bg, BenchmarkGraphData)

    def test_node_ids_match_pydantic(self):
        raw = generate_graph_input("sparse_random", 50, "traversal", ["bfs"])
        bg = parse_benchmark_graph(raw)
        node_ids_pydantic, *_ = _pydantic_extract(raw)
        assert bg.node_ids == node_ids_pydantic

    def test_edges_match_pydantic(self):
        raw = generate_graph_input("sparse_random", 30, "shortest_path", ["dijkstra"])
        bg = parse_benchmark_graph(raw)
        _, _, _, _, _, edges_pydantic, _ = _pydantic_extract(raw)
        assert bg.edges == edges_pydantic

    def test_source_target_match_pydantic(self):
        raw = generate_graph_input("tree", 50, "traversal", ["bfs"])
        bg = parse_benchmark_graph(raw)
        _, source_p, target_p, _, _, _, _ = _pydantic_extract(raw)
        assert bg.source == source_p
        assert bg.target == target_p

    def test_directed_weighted_flags(self):
        raw = generate_graph_input("sparse_random", 30, "shortest_path", ["dijkstra"])
        bg = parse_benchmark_graph(raw)
        assert bg.directed is True
        assert bg.weighted is True

    def test_unweighted_undirected(self):
        raw = generate_graph_input("sparse_random", 30, "traversal", ["bfs"])
        bg = parse_benchmark_graph(raw)
        assert bg.directed is False
        assert bg.weighted is False

    def test_unweighted_edges_default_to_1(self):
        raw = generate_graph_input("sparse_random", 20, "traversal", ["bfs"])
        bg = parse_benchmark_graph(raw)
        for u, v, w in bg.edges:
            assert w == 1.0


# ---------------------------------------------------------------------------
# Coordinates
# ---------------------------------------------------------------------------

class TestParseBenchmarkGraphCoords:
    def test_coords_present_for_shortest_path(self):
        raw = generate_graph_input("grid", 25, "shortest_path", ["dijkstra"])
        bg = parse_benchmark_graph(raw)
        assert bg.coords is not None
        assert len(bg.coords) == 25

    def test_coords_none_for_traversal(self):
        raw = generate_graph_input("sparse_random", 20, "traversal", ["bfs"])
        bg = parse_benchmark_graph(raw)
        assert bg.coords is None

    def test_coords_match_pydantic(self):
        raw = generate_graph_input("grid", 25, "shortest_path", ["astar"])
        bg = parse_benchmark_graph(raw)
        _, _, _, _, _, _, coords_pydantic = _pydantic_extract(raw)
        assert bg.coords == coords_pydantic


# ---------------------------------------------------------------------------
# Category coverage
# ---------------------------------------------------------------------------

class TestParseBenchmarkGraphCategories:
    @pytest.mark.parametrize("family,category,algos", [
        ("sparse_random", "traversal", ["bfs"]),
        ("dense_random", "traversal", ["dfs"]),
        ("tree", "traversal", ["bfs"]),
        ("grid", "traversal", ["bfs"]),
        ("complete", "traversal", ["bfs"]),
        ("sparse_random", "shortest_path", ["dijkstra"]),
        ("grid", "shortest_path", ["astar"]),
        ("tree", "shortest_path", ["bellman_ford"]),
        ("sparse_random", "mst", ["prims"]),
        ("dense_random", "mst", ["kruskals"]),
        ("complete", "mst", ["prims"]),
        ("chain", "ordering", ["topological_sort"]),
        ("sparse_dag", "ordering", ["topological_sort"]),
        ("dense_dag", "ordering", ["topological_sort"]),
        ("layered_dag", "ordering", ["topological_sort"]),
    ])
    def test_matches_pydantic_extraction(self, family, category, algos):
        raw = generate_graph_input(family, 25, category, algos)
        bg = parse_benchmark_graph(raw)
        node_ids_p, source_p, target_p, dir_p, wt_p, edges_p, coords_p = _pydantic_extract(raw)

        assert bg.node_ids == node_ids_p
        assert bg.source == source_p
        assert bg.target == target_p
        assert bg.directed == dir_p
        assert bg.weighted == wt_p
        assert bg.edges == edges_p
        assert bg.coords == coords_p


# ---------------------------------------------------------------------------
# Ordering source/target = None
# ---------------------------------------------------------------------------

class TestParseBenchmarkGraphOrdering:
    def test_ordering_has_no_source_target(self):
        raw = generate_graph_input("chain", 20, "ordering", ["topological_sort"])
        bg = parse_benchmark_graph(raw)
        assert bg.source is None
        assert bg.target is None


# ---------------------------------------------------------------------------
# Edge cases
# ---------------------------------------------------------------------------

class TestParseBenchmarkGraphEdgeCases:
    def test_single_node_no_edges(self):
        raw = {
            "nodes": [{"id": "0"}],
            "edges": [],
            "source": "0",
            "target": None,
            "directed": False,
            "weighted": False,
            "mode": "graph",
        }
        bg = parse_benchmark_graph(raw)
        assert bg.node_ids == ["0"]
        assert bg.edges == []
        assert bg.source == "0"
        assert bg.target is None

    def test_source_equals_target(self):
        # A graph where source and target are the same node is valid to parse
        raw = {
            "nodes": [{"id": "A"}, {"id": "B"}],
            "edges": [{"source": "A", "target": "B", "weight": 5}],
            "source": "A",
            "target": "A",
            "directed": True,
            "weighted": True,
            "mode": "graph",
        }
        bg = parse_benchmark_graph(raw)
        assert bg.source == "A"
        assert bg.target == "A"
        assert bg.node_ids == ["A", "B"]
        assert bg.edges == [("A", "B", 5.0)]

    def test_large_graph_does_not_error(self):
        random.seed(0)
        raw = generate_graph_input("sparse_random", 500, "traversal", ["bfs"])
        bg = parse_benchmark_graph(raw)
        assert len(bg.node_ids) == 500
        assert len(bg.edges) > 0
        assert bg.source is not None

    def test_large_weighted_graph_does_not_error(self):
        random.seed(0)
        raw = generate_graph_input("sparse_random", 600, "shortest_path", ["dijkstra"])
        bg = parse_benchmark_graph(raw)
        assert len(bg.node_ids) == 600
        assert bg.directed is True
        assert bg.weighted is True
        assert bg.coords is not None
        assert len(bg.coords) == 600

    def test_single_node_with_coords(self):
        raw = {
            "nodes": [{"id": "0", "x": 1.5, "y": 2.5}],
            "edges": [],
            "source": "0",
            "target": None,
            "directed": True,
            "weighted": True,
            "mode": "graph",
        }
        bg = parse_benchmark_graph(raw)
        assert bg.coords is not None
        assert bg.coords["0"] == (1.5, 2.5)
        assert bg.edges == []

    def test_missing_weight_defaults_to_1(self):
        raw = {
            "nodes": [{"id": "0"}, {"id": "1"}],
            "edges": [{"source": "0", "target": "1"}],
            "source": "0",
            "target": "1",
            "directed": True,
            "weighted": False,
            "mode": "graph",
        }
        bg = parse_benchmark_graph(raw)
        assert bg.edges == [("0", "1", 1.0)]
