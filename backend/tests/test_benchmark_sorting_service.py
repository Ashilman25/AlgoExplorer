from app.benchmark.service import _resolve_metric_key, run_benchmark


def test_runtime_ms_universal():
    for algo in ["quicksort", "mergesort", "bubble_sort", "insertion_sort", "selection_sort", "heap_sort"]:
        assert _resolve_metric_key("sorting", algo, "runtime_ms") == "runtime_ms"


def test_comparisons_maps_for_all():
    for algo in ["quicksort", "mergesort", "bubble_sort", "insertion_sort", "selection_sort", "heap_sort"]:
        assert _resolve_metric_key("sorting", algo, "comparisons") == "comparisons"


def test_swaps_maps_correctly():
    for algo in ["quicksort", "mergesort", "bubble_sort", "selection_sort", "heap_sort"]:
        assert _resolve_metric_key("sorting", algo, "swaps") == "swaps"
    # insertion_sort maps swaps -> shifts
    assert _resolve_metric_key("sorting", "insertion_sort", "swaps") == "shifts"


def test_writes_maps_correctly():
    for algo in ["quicksort", "mergesort", "insertion_sort"]:
        assert _resolve_metric_key("sorting", algo, "writes") == "writes"
    # these algorithms don't produce writes
    for algo in ["bubble_sort", "selection_sort", "heap_sort"]:
        assert _resolve_metric_key("sorting", algo, "writes") is None


def test_graph_metric_map_still_works():
    assert _resolve_metric_key("graph", "bfs", "max_structure_size") == "frontier_size"
    assert _resolve_metric_key("graph", "bellman_ford", "nodes_visited") is None


def test_bubble_sort_benchmark():
    config = {
        "algorithm_keys": ["bubble_sort"],
        "input_family": "random",
        "sizes": [10, 25],
        "trials_per_size": 2,
        "metrics": ["runtime_ms", "comparisons", "swaps", "writes"],
    }
    result = run_benchmark("sorting", config)
    assert result["summary"]["total_algorithms"] == 1
    assert result["summary"]["total_runs"] == 4

    # swaps should have real values
    swaps_points = result["series"]["swaps"][0]["points"]
    assert swaps_points[0]["mean"] is not None

    # writes should be null (bubble_sort doesn't track writes)
    writes_points = result["series"]["writes"][0]["points"]
    assert writes_points[0]["mean"] is None


def test_insertion_sort_benchmark():
    config = {
        "algorithm_keys": ["insertion_sort"],
        "input_family": "reversed",
        "sizes": [10, 25],
        "trials_per_size": 1,
        "metrics": ["runtime_ms", "comparisons", "swaps", "writes"],
    }
    result = run_benchmark("sorting", config)
    assert result["summary"]["total_algorithms"] == 1

    # swaps maps to shifts — should have real values on reversed input
    swaps_points = result["series"]["swaps"][0]["points"]
    assert swaps_points[0]["mean"] is not None
    assert swaps_points[0]["mean"] > 0

    # writes should have real values
    writes_points = result["series"]["writes"][0]["points"]
    assert writes_points[0]["mean"] is not None


def test_selection_sort_benchmark():
    config = {
        "algorithm_keys": ["selection_sort"],
        "input_family": "random",
        "sizes": [10],
        "trials_per_size": 1,
        "metrics": ["runtime_ms", "comparisons", "swaps"],
    }
    result = run_benchmark("sorting", config)
    assert result["summary"]["total_runs"] == 1
    assert result["series"]["comparisons"][0]["points"][0]["mean"] is not None


def test_heap_sort_benchmark():
    config = {
        "algorithm_keys": ["heap_sort"],
        "input_family": "random",
        "sizes": [10],
        "trials_per_size": 1,
        "metrics": ["runtime_ms", "comparisons", "swaps"],
    }
    result = run_benchmark("sorting", config)
    assert result["summary"]["total_runs"] == 1
    assert result["series"]["swaps"][0]["points"][0]["mean"] is not None


def test_all_six_sorting_algorithms_benchmark():
    config = {
        "algorithm_keys": ["quicksort", "mergesort", "bubble_sort", "insertion_sort", "selection_sort"],
        "input_family": "random",
        "sizes": [10],
        "trials_per_size": 1,
        "metrics": ["runtime_ms", "comparisons"],
    }
    result = run_benchmark("sorting", config)
    assert result["summary"]["total_algorithms"] == 5
    assert result["summary"]["total_runs"] == 5
    algo_keys = [s["algorithm_key"] for s in result["series"]["comparisons"]]
    assert set(algo_keys) == {"quicksort", "mergesort", "bubble_sort", "insertion_sort", "selection_sort"}


def test_table_rows_contain_sorting_metrics():
    config = {
        "algorithm_keys": ["bubble_sort"],
        "input_family": "random",
        "sizes": [10],
        "trials_per_size": 1,
        "metrics": ["runtime_ms", "comparisons", "swaps"],
    }
    result = run_benchmark("sorting", config)
    row = result["table"][0]
    assert row["algorithm_key"] == "bubble_sort"
    assert row["size"] == 10
    assert "runtime_mean" in row
    assert "comparisons_mean" in row
    assert "swaps_mean" in row
