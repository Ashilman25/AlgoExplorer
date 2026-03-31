import random
from collections import deque

import pytest

from app.benchmark.graph_inputs import (
    _tree,
    _sparse_random,
    _dense_random,
    _grid,
    _complete,
    _chain,
    _sparse_dag,
    _dense_dag,
    _layered_dag,
    _add_weights,
    _add_coordinates,
    _pick_source_target,
    generate_graph_input,
)


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

def _node_ids(nodes):
    return {str(n["id"]) for n in nodes}


def _edge_set(edges):
    return {(str(e["source"]), str(e["target"])) for e in edges}


def _is_connected_undirected(nodes, edges):
    ids = _node_ids(nodes)
    if len(ids) == 0:
        return True

    adj = {nid: [] for nid in ids}
    for e in edges:
        s, t = str(e["source"]), str(e["target"])
        adj[s].append(t)
        adj[t].append(s)

    start = next(iter(ids))
    visited = {start}
    queue = deque([start])
    while queue:
        current = queue.popleft()
        for neighbor in adj[current]:
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)

    return visited == ids


def _is_dag(nodes, edges):
    ids = _node_ids(nodes)
    in_degree = {nid: 0 for nid in ids}
    adj = {nid: [] for nid in ids}

    for e in edges:
        s, t = str(e["source"]), str(e["target"])
        adj[s].append(t)
        in_degree[t] += 1

    queue = deque([nid for nid, deg in in_degree.items() if deg == 0])
    visited_count = 0

    while queue:
        current = queue.popleft()
        visited_count += 1
        for neighbor in adj[current]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    return visited_count == len(ids)


def _edges_only_go_forward(edges):
    for e in edges:
        assert int(e["source"]) < int(e["target"]), (
            f"Edge ({e['source']} -> {e['target']}) is not forward"
        )


# ---------------------------------------------------------------------------
# TestTree
# ---------------------------------------------------------------------------

class TestTree:
    def test_node_count(self):
        result = _tree(50)
        assert len(result["nodes"]) == 50

    def test_edge_count_v_minus_one(self):
        result = _tree(100)
        assert len(result["edges"]) == 99

    def test_connected(self):
        result = _tree(80)
        assert _is_connected_undirected(result["nodes"], result["edges"])

    def test_no_weights(self):
        result = _tree(30)
        for e in result["edges"]:
            assert "weight" not in e

    def test_no_self_loops(self):
        result = _tree(60)
        for e in result["edges"]:
            assert e["source"] != e["target"]


# ---------------------------------------------------------------------------
# TestSparseRandom
# ---------------------------------------------------------------------------

class TestSparseRandom:
    def test_node_count(self):
        result = _sparse_random(200)
        assert len(result["nodes"]) == 200

    def test_edge_count_approximately_2v(self):
        result = _sparse_random(200)
        edge_count = len(result["edges"])
        assert 200 <= edge_count <= 600, f"Expected 200-600 edges, got {edge_count}"

    def test_connected(self):
        result = _sparse_random(100)
        assert _is_connected_undirected(result["nodes"], result["edges"])

    def test_no_self_loops(self):
        result = _sparse_random(100)
        for e in result["edges"]:
            assert e["source"] != e["target"]


# ---------------------------------------------------------------------------
# TestDenseRandom
# ---------------------------------------------------------------------------

class TestDenseRandom:
    def test_node_count(self):
        result = _dense_random(30)
        assert len(result["nodes"]) == 30

    def test_edge_count_in_dense_range(self):
        result = _dense_random(30)
        max_edges = 30 * 29 // 2  # 435
        edge_count = len(result["edges"])
        low = int(max_edges * 0.30)
        high = int(max_edges * 0.70)
        assert low <= edge_count <= high, (
            f"Expected {low}-{high} edges, got {edge_count}"
        )

    def test_connected(self):
        result = _dense_random(30)
        assert _is_connected_undirected(result["nodes"], result["edges"])


# ---------------------------------------------------------------------------
# TestGrid
# ---------------------------------------------------------------------------

class TestGrid:
    def test_node_count(self):
        result = _grid(16)
        assert len(result["nodes"]) == 16

    def test_edge_count_4x4(self):
        result = _grid(16)
        # 2 * side * (side - 1) = 2 * 4 * 3 = 24
        assert len(result["edges"]) == 24

    def test_connected(self):
        result = _grid(25)
        assert _is_connected_undirected(result["nodes"], result["edges"])

    def test_nodes_have_coordinates(self):
        result = _grid(16)
        for n in result["nodes"]:
            assert "x" in n and isinstance(n["x"], float)
            assert "y" in n and isinstance(n["y"], float)


# ---------------------------------------------------------------------------
# TestComplete
# ---------------------------------------------------------------------------

class TestComplete:
    def test_node_count(self):
        result = _complete(20)
        assert len(result["nodes"]) == 20

    def test_edge_count(self):
        result = _complete(20)
        expected = 20 * 19 // 2
        assert len(result["edges"]) == expected

    def test_connected(self):
        result = _complete(15)
        assert _is_connected_undirected(result["nodes"], result["edges"])

    def test_no_duplicate_edges(self):
        result = _complete(20)
        pairs = set()
        for e in result["edges"]:
            pair = (min(e["source"], e["target"]), max(e["source"], e["target"]))
            assert pair not in pairs, f"Duplicate edge: {pair}"
            pairs.add(pair)


# ---------------------------------------------------------------------------
# TestChain
# ---------------------------------------------------------------------------

class TestChain:
    def test_node_count(self):
        result = _chain(50)
        assert len(result["nodes"]) == 50

    def test_edge_count(self):
        result = _chain(50)
        assert len(result["edges"]) == 49

    def test_is_dag(self):
        result = _chain(50)
        assert _is_dag(result["nodes"], result["edges"])

    def test_linear_sequence(self):
        result = _chain(30)
        for i, e in enumerate(result["edges"]):
            assert e["source"] == str(i)
            assert e["target"] == str(i + 1)


# ---------------------------------------------------------------------------
# TestSparseDAG
# ---------------------------------------------------------------------------

class TestSparseDAG:
    def test_node_count(self):
        result = _sparse_dag(200)
        assert len(result["nodes"]) == 200

    def test_edge_count_approximately_2v(self):
        result = _sparse_dag(200)
        edge_count = len(result["edges"])
        assert 200 <= edge_count <= 600, f"Expected 200-600 edges, got {edge_count}"

    def test_is_dag(self):
        result = _sparse_dag(100)
        assert _is_dag(result["nodes"], result["edges"])

    def test_edges_forward_only(self):
        result = _sparse_dag(100)
        _edges_only_go_forward(result["edges"])


# ---------------------------------------------------------------------------
# TestDenseDAG
# ---------------------------------------------------------------------------

class TestDenseDAG:
    def test_node_count(self):
        result = _dense_dag(30)
        assert len(result["nodes"]) == 30

    def test_edge_count_in_range(self):
        result = _dense_dag(30)
        max_forward = 30 * 29 // 2  # 435
        edge_count = len(result["edges"])
        low = int(max_forward * 0.10)
        high = int(max_forward * 0.50)
        assert low <= edge_count <= high, (
            f"Expected {low}-{high} edges, got {edge_count}"
        )

    def test_is_dag(self):
        result = _dense_dag(30)
        assert _is_dag(result["nodes"], result["edges"])

    def test_edges_forward_only(self):
        result = _dense_dag(30)
        _edges_only_go_forward(result["edges"])


# ---------------------------------------------------------------------------
# TestLayeredDAG
# ---------------------------------------------------------------------------

class TestLayeredDAG:
    def test_node_count(self):
        result = _layered_dag(100)
        assert len(result["nodes"]) == 100

    def test_is_dag(self):
        result = _layered_dag(100)
        assert _is_dag(result["nodes"], result["edges"])

    def test_edges_forward_only(self):
        result = _layered_dag(100)
        _edges_only_go_forward(result["edges"])

    def test_edge_count_reasonable(self):
        result = _layered_dag(100)
        edge_count = len(result["edges"])
        # roughly 1-4V edges
        assert 50 <= edge_count <= 400, (
            f"Expected 50-400 edges for size 100, got {edge_count}"
        )


# ---------------------------------------------------------------------------
# TestAddWeights
# ---------------------------------------------------------------------------

class TestAddWeights:
    def test_all_edges_get_positive_weights(self):
        edges = [{"source": str(i), "target": str(i + 1)} for i in range(20)]
        weighted = _add_weights(edges)
        for e in weighted:
            assert "weight" in e
            assert 1 <= e["weight"] <= 100

    def test_negative_weights_appear_when_allowed(self):
        edges = [{"source": str(i), "target": str(i + 1)} for i in range(100)]
        random.seed(42)
        weighted = _add_weights(edges, allow_negative = True)
        has_negative = any(e["weight"] < 0 for e in weighted)
        assert has_negative, "Expected at least one negative weight with 100 edges"

    def test_no_negative_when_not_allowed(self):
        edges = [{"source": str(i), "target": str(i + 1)} for i in range(100)]
        weighted = _add_weights(edges, allow_negative = False)
        for e in weighted:
            assert e["weight"] > 0


# ---------------------------------------------------------------------------
# TestAddCoordinates
# ---------------------------------------------------------------------------

class TestAddCoordinates:
    def test_all_nodes_get_float_coordinates(self):
        nodes = [{"id": str(i)} for i in range(25)]
        coordinated = _add_coordinates(nodes)
        for n in coordinated:
            assert isinstance(n["x"], float)
            assert isinstance(n["y"], float)

    def test_existing_coordinates_preserved(self):
        nodes = [{"id": "0", "x": 5.0, "y": 10.0}, {"id": "1"}]
        coordinated = _add_coordinates(nodes)
        assert coordinated[0]["x"] == 5.0
        assert coordinated[0]["y"] == 10.0
        assert isinstance(coordinated[1]["x"], float)
        assert isinstance(coordinated[1]["y"], float)


# ---------------------------------------------------------------------------
# TestPickSourceTarget
# ---------------------------------------------------------------------------

class TestPickSourceTarget:
    def test_source_always_set(self):
        nodes = [{"id": str(i)} for i in range(10)]
        edges = [{"source": str(i), "target": str(i + 1)} for i in range(9)]
        source, target = _pick_source_target(nodes, edges, need_target = False)
        assert source is not None
        assert source in {n["id"] for n in nodes}

    def test_target_none_when_not_needed(self):
        nodes = [{"id": str(i)} for i in range(10)]
        edges = [{"source": str(i), "target": str(i + 1)} for i in range(9)]
        source, target = _pick_source_target(nodes, edges, need_target = False)
        assert target is None

    def test_source_not_equal_target_when_target_needed(self):
        nodes = [{"id": str(i)} for i in range(20)]
        edges = [{"source": str(i), "target": str(i + 1)} for i in range(19)]
        source, target = _pick_source_target(nodes, edges, need_target = True)
        assert source is not None
        assert target is not None
        assert source != target


# ---------------------------------------------------------------------------
# TestGenerateGraphInput
# ---------------------------------------------------------------------------

class TestGenerateGraphInput:
    def test_traversal_sparse_random(self):
        result = generate_graph_input("sparse_random", 50, "traversal", ["bfs"])
        assert result["directed"] is False
        assert result["weighted"] is False
        assert result["source"] is not None
        assert result["target"] is not None
        assert len(result["nodes"]) == 50
        assert result["mode"] == "graph"

    def test_shortest_path_grid(self):
        result = generate_graph_input("grid", 25, "shortest_path", ["dijkstra"])
        assert result["directed"] is True
        assert result["weighted"] is True
        for e in result["edges"]:
            assert "weight" in e
        for n in result["nodes"]:
            assert "x" in n and "y" in n

    def test_mst_sparse_random(self):
        result = generate_graph_input("sparse_random", 50, "mst", ["prims"])
        assert result["directed"] is False
        assert result["weighted"] is True
        for e in result["edges"]:
            assert "weight" in e

    def test_ordering_chain(self):
        result = generate_graph_input("chain", 30, "ordering", ["topological_sort"])
        assert result["directed"] is True
        assert result["weighted"] is False
        assert result["source"] is None
        assert result["target"] is None

    def test_bellman_ford_gets_negative_weights(self):
        random.seed(42)
        result = generate_graph_input(
            "sparse_random", 100, "shortest_path", ["bellman_ford"],
        )
        has_negative = any(e["weight"] < 0 for e in result["edges"])
        assert has_negative, "Expected negative weights for bellman_ford"

    def test_mode_is_graph_for_all(self):
        combos = [
            ("sparse_random", 50, "traversal", ["bfs"]),
            ("grid", 25, "shortest_path", ["dijkstra"]),
            ("sparse_random", 50, "mst", ["prims"]),
            ("chain", 30, "ordering", ["topological_sort"]),
        ]
        for family, size, category, algo_keys in combos:
            result = generate_graph_input(family, size, category, algo_keys)
            assert result["mode"] == "graph", (
                f"mode should be 'graph' for {family}/{category}"
            )
