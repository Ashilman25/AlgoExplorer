from unittest.mock import MagicMock
from app.benchmark.service import run_benchmark


def test_graph_traversal_benchmark_produces_results():
    config = {
        "category": "traversal",
        "algorithm_keys": ["bfs", "dfs"],
        "input_family": "sparse_random",
        "sizes": [10, 25],
        "trials_per_size": 2,
        "metrics": ["runtime_ms", "nodes_visited"],
    }
    result = run_benchmark("graph", config)
    assert "series" in result and "table" in result and "summary" in result
    assert result["summary"]["total_algorithms"] == 2
    assert result["summary"]["total_sizes"] == 2
    assert result["summary"]["total_runs"] == 8
    assert "runtime_ms" in result["series"]
    assert "nodes_visited" in result["series"]
    for metric_key in ["runtime_ms", "nodes_visited"]:
        algo_keys = [s["algorithm_key"] for s in result["series"][metric_key]]
        assert "bfs" in algo_keys and "dfs" in algo_keys


def test_graph_shortest_path_benchmark():
    config = {
        "category": "shortest_path",
        "algorithm_keys": ["dijkstra"],
        "input_family": "sparse_random",
        "sizes": [10],
        "trials_per_size": 1,
        "metrics": ["runtime_ms", "nodes_visited", "relaxations"],
    }
    result = run_benchmark("graph", config)
    assert result["summary"]["total_runs"] == 1
    assert "runtime_ms" in result["series"]
    assert "relaxations" in result["series"]


def test_graph_mst_benchmark():
    config = {
        "category": "mst",
        "algorithm_keys": ["prims", "kruskals"],
        "input_family": "sparse_random",
        "sizes": [10, 25],
        "trials_per_size": 1,
        "metrics": ["runtime_ms", "edges_added", "mst_total_weight"],
    }
    result = run_benchmark("graph", config)
    assert result["summary"]["total_algorithms"] == 2
    for s in result["series"]["mst_total_weight"]:
        assert len(s["points"]) == 2


def test_graph_ordering_benchmark():
    config = {
        "category": "ordering",
        "algorithm_keys": ["topological_sort"],
        "input_family": "chain",
        "sizes": [10, 25],
        "trials_per_size": 2,
        "metrics": ["runtime_ms", "nodes_ordered"],
    }
    result = run_benchmark("graph", config)
    assert result["summary"]["total_algorithms"] == 1
    assert result["summary"]["total_runs"] == 4


def test_graph_progress_callback():
    callback = MagicMock()
    config = {
        "category": "traversal",
        "algorithm_keys": ["bfs"],
        "input_family": "tree",
        "sizes": [10, 20],
        "trials_per_size": 2,
        "metrics": ["runtime_ms"],
    }
    run_benchmark("graph", config, progress_callback = callback)
    assert callback.call_count == 2
    calls = [c.args for c in callback.call_args_list]
    assert calls[0] == (2, 4)
    assert calls[1] == (4, 4)


def test_null_metric_for_unmapped_algorithm():
    config = {
        "category": "shortest_path",
        "algorithm_keys": ["bellman_ford"],
        "input_family": "sparse_random",
        "sizes": [10],
        "trials_per_size": 1,
        "metrics": ["runtime_ms", "nodes_visited"],
    }
    result = run_benchmark("graph", config)
    nv_series = result["series"]["nodes_visited"]
    assert len(nv_series) == 1
    assert nv_series[0]["algorithm_key"] == "bellman_ford"
    assert nv_series[0]["points"][0]["mean"] is None


def test_table_row_has_graph_metrics():
    config = {
        "category": "traversal",
        "algorithm_keys": ["bfs"],
        "input_family": "tree",
        "sizes": [10],
        "trials_per_size": 1,
        "metrics": ["runtime_ms", "nodes_visited"],
    }
    result = run_benchmark("graph", config)
    row = result["table"][0]
    assert row["algorithm_key"] == "bfs"
    assert row["size"] == 10
    assert "runtime_mean" in row
    assert "nodes_visited_mean" in row


def test_sorting_benchmark_still_works():
    config = {
        "algorithm_keys": ["quicksort"],
        "input_family": "random",
        "sizes": [10],
        "trials_per_size": 1,
        "metrics": ["runtime_ms", "comparisons"],
    }
    result = run_benchmark("sorting", config)
    assert result["summary"]["total_runs"] == 1
    assert "runtime_ms" in result["series"]
    assert "comparisons" in result["series"]
