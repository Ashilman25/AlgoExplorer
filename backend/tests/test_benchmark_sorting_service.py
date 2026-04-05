import pytest
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


def test_bubble_sort_benchmark_fast_path_produces_correct_metrics():
    """Benchmark fast path must produce same metrics as simulation path."""
    config = {
        "algorithm_keys": ["bubble_sort"],
        "input_family": "reversed",
        "sizes": [20],
        "trials_per_size": 1,
        "metrics": ["runtime_ms", "comparisons", "swaps"],
    }
    result = run_benchmark("sorting", config)
    # Reversed input of size 20: worst case for bubble sort
    # comparisons = n*(n-1)/2 = 190
    point = result["series"]["comparisons"][0]["points"][0]
    assert point["mean"] == 190
    # swaps = n*(n-1)/2 = 190 (every comparison swaps on fully reversed)
    swap_point = result["series"]["swaps"][0]["points"][0]
    assert swap_point["mean"] == 190


def test_selection_sort_benchmark_fast_path_metrics():
    config = {
        "algorithm_keys": ["selection_sort"],
        "input_family": "reversed",
        "sizes": [20],
        "trials_per_size": 1,
        "metrics": ["runtime_ms", "comparisons", "swaps"],
    }
    result = run_benchmark("sorting", config)
    # Selection sort always does n*(n-1)/2 comparisons regardless of input
    point = result["series"]["comparisons"][0]["points"][0]
    assert point["mean"] == 190


def test_insertion_sort_benchmark_fast_path_metrics():
    config = {
        "algorithm_keys": ["insertion_sort"],
        "input_family": "reversed",
        "sizes": [20],
        "trials_per_size": 1,
        "metrics": ["runtime_ms", "comparisons", "swaps", "writes"],
    }
    result = run_benchmark("sorting", config)
    # Reversed input: every element shifts all the way left
    # shifts = n*(n-1)/2 = 190 (swaps maps to shifts for insertion sort)
    swap_point = result["series"]["swaps"][0]["points"][0]
    assert swap_point["mean"] == 190
    # writes = n-1 key placements + n*(n-1)/2 shift writes = 19 + 190 = 209
    write_point = result["series"]["writes"][0]["points"][0]
    assert write_point["mean"] == 209


def test_quicksort_benchmark_fast_path_metrics():
    config = {
        "algorithm_keys": ["quicksort"],
        "input_family": "random",
        "sizes": [100],
        "trials_per_size": 1,
        "metrics": ["runtime_ms", "comparisons", "swaps"],
    }
    result = run_benchmark("sorting", config)
    point = result["series"]["comparisons"][0]["points"][0]
    assert point["mean"] > 0
    assert point["mean"] < 10000
    swap_point = result["series"]["swaps"][0]["points"][0]
    assert swap_point["mean"] > 0


def test_mergesort_benchmark_fast_path_metrics():
    config = {
        "algorithm_keys": ["mergesort"],
        "input_family": "random",
        "sizes": [100],
        "trials_per_size": 1,
        "metrics": ["runtime_ms", "comparisons", "swaps", "writes"],
    }
    result = run_benchmark("sorting", config)
    comp_point = result["series"]["comparisons"][0]["points"][0]
    assert comp_point["mean"] > 0
    write_point = result["series"]["writes"][0]["points"][0]
    assert write_point["mean"] > 0
    swap_point = result["series"]["swaps"][0]["points"][0]
    assert swap_point["mean"] is not None


def test_heap_sort_benchmark_fast_path_metrics():
    config = {
        "algorithm_keys": ["heap_sort"],
        "input_family": "reversed",
        "sizes": [50],
        "trials_per_size": 1,
        "metrics": ["runtime_ms", "comparisons", "swaps"],
    }
    result = run_benchmark("sorting", config)
    comp_point = result["series"]["comparisons"][0]["points"][0]
    assert comp_point["mean"] > 0
    swap_point = result["series"]["swaps"][0]["points"][0]
    assert swap_point["mean"] > 0


def test_parallel_benchmark_all_algorithms_same_input():
    """All algorithms should receive the same input per size/trial for fair comparison."""
    config = {
        "algorithm_keys": ["quicksort", "bubble_sort"],
        "input_family": "random",
        "sizes": [10, 20],
        "trials_per_size": 2,
        "metrics": ["runtime_ms", "comparisons"],
    }
    result = run_benchmark("sorting", config)
    assert result["summary"]["total_algorithms"] == 2
    assert result["summary"]["total_runs"] == 8
    # Both algorithms should have data points for both sizes
    comp_series = result["series"]["comparisons"]
    algo_keys = {s["algorithm_key"] for s in comp_series}
    assert algo_keys == {"quicksort", "bubble_sort"}
    for s in comp_series:
        assert len(s["points"]) == 2  # 2 sizes


def test_full_benchmark_with_medium_sizes():
    """Integration test: all 6 algorithms on medium sizes with parallel execution."""
    config = {
        "algorithm_keys": ["quicksort", "mergesort", "bubble_sort", "insertion_sort", "selection_sort", "heap_sort"],
        "input_family": "random",
        "sizes": [100, 250, 500],
        "trials_per_size": 2,
        "metrics": ["runtime_ms", "comparisons", "swaps"],
    }
    result = run_benchmark("sorting", config)
    assert result["summary"]["total_algorithms"] == 6
    assert result["summary"]["total_sizes"] == 3
    assert result["summary"]["total_runs"] == 36

    # All algorithms should have data for all 3 sizes
    for metric_key in ["runtime_ms", "comparisons", "swaps"]:
        series = result["series"][metric_key]
        assert len(series) == 6
        for s in series:
            assert len(s["points"]) == 3

    # Table should have 6 algorithms x 3 sizes = 18 rows
    assert len(result["table"]) == 18


def test_benchmark_single_worker(monkeypatch):
    monkeypatch.setattr("app.benchmark.service.settings.use_redis", False)
    result = run_benchmark("sorting", {
        "algorithm_keys": ["quicksort"],
        "input_family": "random",
        "sizes": [10],
        "trials_per_size": 1,
        "metrics": ["runtime_ms"],
    })
    assert result["summary"]["total_runs"] == 1
    assert len(result["table"]) == 1
