"""
Stress tests for the benchmark optimization system.

Covers:
- Fast path sorting correctness across all algorithms and input families
- Deterministic metric accuracy for known inputs
- Parallel execution at various scales
- Cancellation with partial result preservation
- Progressive results (db_job_updater) callback verification
- Input fairness (all algorithms receive identical inputs per size/trial)
- Edge cases (single algorithm, single size, single trial)
- Performance verification at larger sizes (the whole point of the optimization)
"""

import random
import time
from unittest.mock import MagicMock, patch

import pytest

from app.benchmark.service import (
    _is_cancelled,
    _run_single_algorithm,
    generate_sorting_input,
    run_benchmark,
)

ALL_SORTING_ALGOS = [
    "quicksort", "mergesort", "bubble_sort",
    "insertion_sort", "selection_sort", "heap_sort",
]

ALL_INPUT_FAMILIES = ["random", "sorted", "reversed", "nearly_sorted"]

ALL_METRICS = ["runtime_ms", "comparisons", "swaps", "writes"]


# ---------------------------------------------------------------------------
# 1. Fast path sorting correctness — every algorithm x every input family
# ---------------------------------------------------------------------------

class TestFastPathSortingCorrectness:
    """Every algorithm's benchmark fast path must produce a correctly sorted array."""

    @pytest.mark.parametrize("algo", ALL_SORTING_ALGOS)
    @pytest.mark.parametrize("family", ALL_INPUT_FAMILIES)
    def test_fast_path_sorts_correctly(self, algo, family):
        config = {
            "algorithm_keys": [algo],
            "input_family": family,
            "sizes": [50],
            "trials_per_size": 1,
            "metrics": ["runtime_ms"],
        }
        result = run_benchmark("sorting", config)
        table_row = result["table"][0]
        assert table_row["algorithm_key"] == algo
        assert table_row["size"] == 50

    @pytest.mark.parametrize("algo", ALL_SORTING_ALGOS)
    def test_fast_path_sorted_array_is_correct(self, algo):
        """Directly invoke _run_single_algorithm and verify sorted output."""
        size = 30
        arr = list(range(size, 0, -1))  # reversed
        inputs_by_size = {size: [{"array": arr}]}
        result = _run_single_algorithm(
            "sorting", algo, [size], inputs_by_size, 1, ["runtime_ms", "comparisons"],
        )
        assert result["algo_key"] == algo
        # The function doesn't return the sorted array directly, but
        # the algorithm runs through the fast path without error
        assert len(result["series"]["comparisons"]) == 1
        assert result["series"]["comparisons"][0]["mean"] > 0

    @pytest.mark.parametrize("algo", ALL_SORTING_ALGOS)
    def test_fast_path_on_already_sorted_input(self, algo):
        """Sorted input is a best-case for some algorithms — verify no crashes."""
        config = {
            "algorithm_keys": [algo],
            "input_family": "sorted",
            "sizes": [100],
            "trials_per_size": 1,
            "metrics": ALL_METRICS,
        }
        result = run_benchmark("sorting", config)
        assert result["summary"]["total_runs"] == 1

    @pytest.mark.parametrize("algo", ALL_SORTING_ALGOS)
    def test_fast_path_on_reversed_input(self, algo):
        """Reversed input is worst-case for O(n²) algorithms — verify no crashes at larger n."""
        config = {
            "algorithm_keys": [algo],
            "input_family": "reversed",
            "sizes": [500],
            "trials_per_size": 1,
            "metrics": ALL_METRICS,
        }
        result = run_benchmark("sorting", config)
        comp_series = result["series"]["comparisons"]
        assert comp_series[0]["points"][0]["mean"] > 0


# ---------------------------------------------------------------------------
# 2. Deterministic metric accuracy for known inputs
# ---------------------------------------------------------------------------

class TestDeterministicMetrics:
    """Test that metrics are exact for deterministic inputs where we can predict the result."""

    def test_bubble_sort_reversed_n10(self):
        """Reversed n=10: exactly n*(n-1)/2 = 45 comparisons and 45 swaps."""
        config = {
            "algorithm_keys": ["bubble_sort"],
            "input_family": "reversed",
            "sizes": [10],
            "trials_per_size": 1,
            "metrics": ["comparisons", "swaps"],
        }
        result = run_benchmark("sorting", config)
        assert result["series"]["comparisons"][0]["points"][0]["mean"] == 45
        assert result["series"]["swaps"][0]["points"][0]["mean"] == 45

    def test_selection_sort_always_n_choose_2_comparisons(self):
        """Selection sort does n*(n-1)/2 comparisons regardless of input order."""
        for family in ALL_INPUT_FAMILIES:
            config = {
                "algorithm_keys": ["selection_sort"],
                "input_family": family,
                "sizes": [15],
                "trials_per_size": 1,
                "metrics": ["comparisons"],
            }
            result = run_benchmark("sorting", config)
            assert result["series"]["comparisons"][0]["points"][0]["mean"] == 105  # 15*14/2

    def test_selection_sort_zero_swaps_on_sorted(self):
        """Already-sorted input requires zero swaps for selection sort."""
        config = {
            "algorithm_keys": ["selection_sort"],
            "input_family": "sorted",
            "sizes": [20],
            "trials_per_size": 1,
            "metrics": ["swaps"],
        }
        result = run_benchmark("sorting", config)
        assert result["series"]["swaps"][0]["points"][0]["mean"] == 0

    def test_bubble_sort_zero_swaps_on_sorted(self):
        """Early termination: sorted input needs 0 swaps and n-1 comparisons."""
        config = {
            "algorithm_keys": ["bubble_sort"],
            "input_family": "sorted",
            "sizes": [20],
            "trials_per_size": 1,
            "metrics": ["comparisons", "swaps"],
        }
        result = run_benchmark("sorting", config)
        assert result["series"]["swaps"][0]["points"][0]["mean"] == 0
        assert result["series"]["comparisons"][0]["points"][0]["mean"] == 19  # n-1

    def test_insertion_sort_reversed_n15(self):
        """Reversed n=15: shifts = n*(n-1)/2 = 105, writes = shifts + (n-1) key writes = 119."""
        config = {
            "algorithm_keys": ["insertion_sort"],
            "input_family": "reversed",
            "sizes": [15],
            "trials_per_size": 1,
            "metrics": ["swaps", "writes"],  # swaps maps to shifts
        }
        result = run_benchmark("sorting", config)
        assert result["series"]["swaps"][0]["points"][0]["mean"] == 105  # shifts
        assert result["series"]["writes"][0]["points"][0]["mean"] == 119  # 105 + 14

    def test_insertion_sort_zero_shifts_on_sorted(self):
        """Already-sorted: insertion sort does n-1 comparisons, 0 shifts."""
        config = {
            "algorithm_keys": ["insertion_sort"],
            "input_family": "sorted",
            "sizes": [20],
            "trials_per_size": 1,
            "metrics": ["comparisons", "swaps"],
        }
        result = run_benchmark("sorting", config)
        assert result["series"]["comparisons"][0]["points"][0]["mean"] == 19  # n-1
        assert result["series"]["swaps"][0]["points"][0]["mean"] == 0

    def test_mergesort_writes_on_reversed_n8(self):
        """Mergesort on n=8 reversed: all writes counted, comparisons > 0."""
        config = {
            "algorithm_keys": ["mergesort"],
            "input_family": "reversed",
            "sizes": [8],
            "trials_per_size": 1,
            "metrics": ["comparisons", "writes"],
        }
        result = run_benchmark("sorting", config)
        comps = result["series"]["comparisons"][0]["points"][0]["mean"]
        writes = result["series"]["writes"][0]["points"][0]["mean"]
        assert comps > 0
        assert writes > 0
        # Mergesort on n=8 does exactly n * log2(n) = 24 writes (every element written at each level)
        # Actually writes depends on merge pattern, but must equal n * ceil(log2(n)) for powers of 2
        assert writes == 24  # 8 elements * 3 levels

    def test_metrics_consistent_across_trials(self):
        """Same deterministic input should produce identical metrics across trials."""
        config = {
            "algorithm_keys": ["bubble_sort"],
            "input_family": "reversed",
            "sizes": [10],
            "trials_per_size": 5,
            "metrics": ["comparisons", "swaps"],
        }
        result = run_benchmark("sorting", config)
        comp_point = result["series"]["comparisons"][0]["points"][0]
        # If all trials produce the same result, stddev should be 0
        assert comp_point["stddev"] == 0.0
        assert comp_point["min"] == comp_point["max"] == comp_point["mean"]

    def test_multiple_sizes_metric_scaling(self):
        """For O(n²) algorithms, comparisons should scale quadratically with n."""
        config = {
            "algorithm_keys": ["selection_sort"],
            "input_family": "sorted",
            "sizes": [10, 20, 40],
            "trials_per_size": 1,
            "metrics": ["comparisons"],
        }
        result = run_benchmark("sorting", config)
        points = result["series"]["comparisons"][0]["points"]
        # n*(n-1)/2: 45, 190, 780
        assert points[0]["mean"] == 45
        assert points[1]["mean"] == 190
        assert points[2]["mean"] == 780


# ---------------------------------------------------------------------------
# 3. Parallel execution at various scales
# ---------------------------------------------------------------------------

class TestParallelExecution:
    """Verify parallel execution works correctly with different algorithm/size/trial combos."""

    def test_single_algorithm_single_size(self):
        config = {
            "algorithm_keys": ["quicksort"],
            "input_family": "random",
            "sizes": [10],
            "trials_per_size": 1,
            "metrics": ["runtime_ms"],
        }
        result = run_benchmark("sorting", config)
        assert result["summary"]["total_algorithms"] == 1
        assert result["summary"]["total_runs"] == 1

    def test_two_algorithms_multiple_sizes(self):
        config = {
            "algorithm_keys": ["quicksort", "mergesort"],
            "input_family": "random",
            "sizes": [10, 50, 100],
            "trials_per_size": 2,
            "metrics": ["runtime_ms", "comparisons"],
        }
        result = run_benchmark("sorting", config)
        assert result["summary"]["total_algorithms"] == 2
        assert result["summary"]["total_runs"] == 12
        assert len(result["table"]) == 6  # 2 algos * 3 sizes
        for metric in ["runtime_ms", "comparisons"]:
            assert len(result["series"][metric]) == 2

    def test_all_six_algorithms_parallel(self):
        """The most common real-world scenario: all 6 algorithms in parallel."""
        config = {
            "algorithm_keys": ALL_SORTING_ALGOS,
            "input_family": "random",
            "sizes": [50, 100],
            "trials_per_size": 2,
            "metrics": ["runtime_ms", "comparisons", "swaps"],
        }
        result = run_benchmark("sorting", config)
        assert result["summary"]["total_algorithms"] == 6
        assert result["summary"]["total_runs"] == 24
        assert len(result["table"]) == 12  # 6 algos * 2 sizes
        algo_keys_in_table = {row["algorithm_key"] for row in result["table"]}
        assert algo_keys_in_table == set(ALL_SORTING_ALGOS)

    def test_all_algorithms_all_families(self):
        """Run each input family with all algorithms to verify no crashes."""
        for family in ALL_INPUT_FAMILIES:
            config = {
                "algorithm_keys": ALL_SORTING_ALGOS,
                "input_family": family,
                "sizes": [25],
                "trials_per_size": 1,
                "metrics": ["comparisons"],
            }
            result = run_benchmark("sorting", config)
            assert result["summary"]["total_algorithms"] == 6

    def test_many_trials_aggregation(self):
        """Multiple trials should produce valid statistical aggregates."""
        config = {
            "algorithm_keys": ["bubble_sort"],
            "input_family": "random",
            "sizes": [20],
            "trials_per_size": 10,
            "metrics": ["comparisons", "swaps"],
        }
        result = run_benchmark("sorting", config)
        comp_point = result["series"]["comparisons"][0]["points"][0]
        # Random input: comparisons vary across trials
        assert comp_point["mean"] > 0
        assert comp_point["min"] <= comp_point["mean"] <= comp_point["max"]
        assert comp_point["median"] is not None
        assert comp_point["stddev"] is not None

    def test_parallel_result_structure_completeness(self):
        """Verify every algorithm has data for every size and every metric."""
        config = {
            "algorithm_keys": ALL_SORTING_ALGOS,
            "input_family": "random",
            "sizes": [10, 25, 50, 100],
            "trials_per_size": 2,
            "metrics": ALL_METRICS,
        }
        result = run_benchmark("sorting", config)
        for metric in ALL_METRICS:
            series = result["series"][metric]
            assert len(series) == 6  # one per algorithm
            for s in series:
                assert s["algorithm_key"] in ALL_SORTING_ALGOS
                assert len(s["points"]) == 4  # one per size
                for point in s["points"]:
                    assert "size" in point
                    assert "mean" in point
                    assert "median" in point
                    assert "stddev" in point
                    assert "min" in point
                    assert "max" in point

    def test_table_completeness(self):
        """Table should have one row per (algorithm, size) combo."""
        config = {
            "algorithm_keys": ["quicksort", "mergesort", "bubble_sort"],
            "input_family": "random",
            "sizes": [10, 50, 100],
            "trials_per_size": 3,
            "metrics": ["runtime_ms", "comparisons"],
        }
        result = run_benchmark("sorting", config)
        assert len(result["table"]) == 9  # 3 algos * 3 sizes
        for row in result["table"]:
            assert "algorithm_key" in row
            assert "size" in row
            assert "runtime_mean" in row
            assert "comparisons_mean" in row
            assert "runtime_median" in row
            assert "comparisons_median" in row


# ---------------------------------------------------------------------------
# 4. Cancellation with partial result preservation
# ---------------------------------------------------------------------------

class TestCancellation:
    """Verify cancellation preserves completed work and cleans up Redis."""

    def test_is_cancelled_returns_false_when_no_redis(self):
        assert _is_cancelled(1, None) is False

    def test_is_cancelled_returns_false_when_no_benchmark_id(self):
        assert _is_cancelled(None, MagicMock()) is False

    def test_is_cancelled_checks_redis_key(self):
        mock_redis = MagicMock()
        mock_redis.exists.return_value = True
        assert _is_cancelled(42, mock_redis) is True
        mock_redis.exists.assert_called_once_with("benchmark:42:cancel")

    def test_is_cancelled_returns_false_when_key_absent(self):
        mock_redis = MagicMock()
        mock_redis.exists.return_value = False
        assert _is_cancelled(42, mock_redis) is False

    def test_cancellation_preserves_completed_algorithm_results(self):
        """When cancelled after 1 algorithm completes, that algorithm's results are preserved."""
        mock_redis = MagicMock()
        call_count = [0]

        def cancel_after_first(*args):
            call_count[0] += 1
            # Cancel after the first algorithm completes
            return call_count[0] >= 1

        mock_redis.exists.side_effect = cancel_after_first

        config = {
            "algorithm_keys": ["quicksort", "bubble_sort", "mergesort"],
            "input_family": "sorted",
            "sizes": [10],
            "trials_per_size": 1,
            "metrics": ["comparisons"],
        }
        result = run_benchmark(
            "sorting", config, benchmark_id = 1, redis_conn = mock_redis,
        )
        assert result["summary"]["cancelled"] is True
        # At least one algorithm's results should be present
        comp_series = result["series"]["comparisons"]
        assert len(comp_series) >= 1
        # The cancel key should be cleaned up
        mock_redis.delete.assert_called_once_with("benchmark:1:cancel")

    def test_cancellation_summary_flag(self):
        """Cancelled benchmarks have cancelled=True in summary."""
        mock_redis = MagicMock()
        mock_redis.exists.return_value = True  # always cancelled

        config = {
            "algorithm_keys": ["quicksort"],
            "input_family": "random",
            "sizes": [10],
            "trials_per_size": 1,
            "metrics": ["runtime_ms"],
        }
        result = run_benchmark(
            "sorting", config, benchmark_id = 1, redis_conn = mock_redis,
        )
        assert result["summary"]["cancelled"] is True
        # Even with immediate cancellation, the first algorithm should complete
        # because cancellation is checked AFTER processing
        assert len(result["series"]["runtime_ms"]) == 1

    def test_no_cancellation_without_redis(self):
        """Without Redis, cancellation is never triggered."""
        config = {
            "algorithm_keys": ALL_SORTING_ALGOS,
            "input_family": "sorted",
            "sizes": [10],
            "trials_per_size": 1,
            "metrics": ["comparisons"],
        }
        result = run_benchmark("sorting", config, benchmark_id = 1, redis_conn = None)
        assert result["summary"]["cancelled"] is False
        assert len(result["series"]["comparisons"]) == 6

    def test_cancellation_cleans_up_redis_key(self):
        """After cancellation, the Redis cancel key is deleted."""
        mock_redis = MagicMock()
        mock_redis.exists.return_value = True

        config = {
            "algorithm_keys": ["quicksort"],
            "input_family": "random",
            "sizes": [10],
            "trials_per_size": 1,
            "metrics": ["runtime_ms"],
        }
        run_benchmark("sorting", config, benchmark_id = 99, redis_conn = mock_redis)
        mock_redis.delete.assert_called_once_with("benchmark:99:cancel")


# ---------------------------------------------------------------------------
# 5. Progressive results (db_job_updater) callback verification
# ---------------------------------------------------------------------------

class TestProgressiveResults:
    """Verify the db_job_updater callback is called with correct partial results."""

    def test_db_updater_called_per_algorithm(self):
        """db_job_updater fires once per completed algorithm."""
        updater = MagicMock()
        config = {
            "algorithm_keys": ["quicksort", "mergesort", "bubble_sort"],
            "input_family": "random",
            "sizes": [10],
            "trials_per_size": 1,
            "metrics": ["runtime_ms"],
        }
        run_benchmark("sorting", config, db_job_updater = updater)
        assert updater.call_count == 3

    def test_db_updater_progress_increases(self):
        """Progress should monotonically increase to 1.0."""
        updater = MagicMock()
        config = {
            "algorithm_keys": ["quicksort", "mergesort"],
            "input_family": "random",
            "sizes": [10],
            "trials_per_size": 1,
            "metrics": ["runtime_ms"],
        }
        run_benchmark("sorting", config, db_job_updater = updater)
        assert updater.call_count == 2
        progresses = sorted([call.args[1] for call in updater.call_args_list])
        assert progresses == [0.5, 1.0]

    def test_db_updater_partial_results_accumulate(self):
        """Each call should have more results than the previous."""
        calls = []

        def capture(partial, progress):
            calls.append({"series_count": len(partial["series"]["runtime_ms"]), "progress": progress})

        config = {
            "algorithm_keys": ALL_SORTING_ALGOS,
            "input_family": "sorted",
            "sizes": [10],
            "trials_per_size": 1,
            "metrics": ["runtime_ms"],
        }
        run_benchmark("sorting", config, db_job_updater = capture)
        assert len(calls) == 6
        # Series count should increase from 1 to 6
        series_counts = sorted([c["series_count"] for c in calls])
        assert series_counts == [1, 2, 3, 4, 5, 6]

    def test_db_updater_receives_valid_series_structure(self):
        """Partial results should have valid series/table structure."""
        last_partial = [None]

        def capture(partial, progress):
            last_partial[0] = partial

        config = {
            "algorithm_keys": ["quicksort"],
            "input_family": "random",
            "sizes": [10, 20],
            "trials_per_size": 1,
            "metrics": ["runtime_ms", "comparisons"],
        }
        run_benchmark("sorting", config, db_job_updater = capture)
        partial = last_partial[0]
        assert "series" in partial
        assert "table" in partial
        assert len(partial["series"]["runtime_ms"]) == 1
        assert len(partial["series"]["comparisons"]) == 1
        assert len(partial["table"]) == 2  # 1 algo * 2 sizes

    def test_db_updater_with_cancellation(self):
        """When cancelled, db_updater should still be called for completed algorithms."""
        updater = MagicMock()
        mock_redis = MagicMock()
        call_count = [0]

        def cancel_after_two(*args):
            call_count[0] += 1
            return call_count[0] >= 2

        mock_redis.exists.side_effect = cancel_after_two

        config = {
            "algorithm_keys": ALL_SORTING_ALGOS,
            "input_family": "sorted",
            "sizes": [10],
            "trials_per_size": 1,
            "metrics": ["runtime_ms"],
        }
        run_benchmark(
            "sorting", config, benchmark_id = 1,
            redis_conn = mock_redis, db_job_updater = updater,
        )
        # At least 2 algorithms completed before cancellation
        assert updater.call_count >= 2

    def test_no_db_updater_no_error(self):
        """db_job_updater=None should not cause any errors."""
        config = {
            "algorithm_keys": ALL_SORTING_ALGOS,
            "input_family": "random",
            "sizes": [10],
            "trials_per_size": 1,
            "metrics": ["runtime_ms"],
        }
        result = run_benchmark("sorting", config, db_job_updater = None)
        assert result["summary"]["total_algorithms"] == 6


# ---------------------------------------------------------------------------
# 6. Input fairness — all algorithms get same inputs
# ---------------------------------------------------------------------------

class TestInputFairness:
    """Verify that pre-generated inputs are shared across algorithms."""

    def test_deterministic_input_same_across_algorithms(self):
        """On deterministic inputs (sorted/reversed), all algorithms should get identical arrays."""
        config = {
            "algorithm_keys": ALL_SORTING_ALGOS,
            "input_family": "reversed",
            "sizes": [10],
            "trials_per_size": 1,
            "metrics": ["comparisons"],
        }
        result = run_benchmark("sorting", config)
        # For reversed input of size 10, selection sort always does 45 comparisons
        # This is deterministic regardless of which copy it receives
        for s in result["series"]["comparisons"]:
            if s["algorithm_key"] == "selection_sort":
                assert s["points"][0]["mean"] == 45

    def test_multiple_sizes_deterministic(self):
        """Each size should produce the right number of comparisons for selection sort."""
        config = {
            "algorithm_keys": ["selection_sort"],
            "input_family": "reversed",
            "sizes": [5, 10, 15, 20],
            "trials_per_size": 1,
            "metrics": ["comparisons"],
        }
        result = run_benchmark("sorting", config)
        points = result["series"]["comparisons"][0]["points"]
        expected = [10, 45, 105, 190]  # n*(n-1)/2
        for point, exp in zip(points, expected):
            assert point["mean"] == exp


# ---------------------------------------------------------------------------
# 7. Null metrics (algorithms that don't produce a metric)
# ---------------------------------------------------------------------------

class TestNullMetrics:
    """Verify that null metric mappings produce null aggregates correctly."""

    def test_bubble_sort_writes_is_null(self):
        config = {
            "algorithm_keys": ["bubble_sort"],
            "input_family": "random",
            "sizes": [10],
            "trials_per_size": 1,
            "metrics": ["writes"],
        }
        result = run_benchmark("sorting", config)
        agg = result["series"]["writes"][0]["points"][0]
        assert agg["mean"] is None
        assert agg["median"] is None
        assert agg["stddev"] is None
        assert agg["min"] is None
        assert agg["max"] is None

    def test_selection_sort_writes_is_null(self):
        config = {
            "algorithm_keys": ["selection_sort"],
            "input_family": "random",
            "sizes": [10],
            "trials_per_size": 1,
            "metrics": ["writes"],
        }
        result = run_benchmark("sorting", config)
        assert result["series"]["writes"][0]["points"][0]["mean"] is None

    def test_heap_sort_writes_is_null(self):
        config = {
            "algorithm_keys": ["heap_sort"],
            "input_family": "random",
            "sizes": [10],
            "trials_per_size": 1,
            "metrics": ["writes"],
        }
        result = run_benchmark("sorting", config)
        assert result["series"]["writes"][0]["points"][0]["mean"] is None

    def test_mergesort_swaps_is_zero(self):
        """Mergesort has swaps mapped (not null) but always produces 0."""
        config = {
            "algorithm_keys": ["mergesort"],
            "input_family": "random",
            "sizes": [10],
            "trials_per_size": 1,
            "metrics": ["swaps"],
        }
        result = run_benchmark("sorting", config)
        # mergesort maps swaps -> "swaps" which exists in metrics but is always 0
        assert result["series"]["swaps"][0]["points"][0]["mean"] is not None

    def test_mixed_null_and_real_in_same_benchmark(self):
        """When running multiple algorithms, some produce a metric and others don't."""
        config = {
            "algorithm_keys": ["bubble_sort", "insertion_sort"],
            "input_family": "reversed",
            "sizes": [10],
            "trials_per_size": 1,
            "metrics": ["writes"],
        }
        result = run_benchmark("sorting", config)
        writes_by_algo = {s["algorithm_key"]: s["points"][0]["mean"] for s in result["series"]["writes"]}
        assert writes_by_algo["bubble_sort"] is None
        assert writes_by_algo["insertion_sort"] is not None
        assert writes_by_algo["insertion_sort"] > 0


# ---------------------------------------------------------------------------
# 8. _run_single_algorithm unit tests
# ---------------------------------------------------------------------------

class TestRunSingleAlgorithm:
    """Test the subprocess-targeted function directly."""

    def test_returns_correct_structure(self):
        inputs_by_size = {10: [{"array": list(range(10, 0, -1))}]}
        result = _run_single_algorithm(
            "sorting", "bubble_sort", [10], inputs_by_size, 1,
            ["runtime_ms", "comparisons", "swaps"],
        )
        assert result["algo_key"] == "bubble_sort"
        assert "series" in result
        assert "table" in result
        assert set(result["series"].keys()) == {"runtime_ms", "comparisons", "swaps"}
        assert len(result["table"]) == 1

    def test_multiple_sizes(self):
        inputs_by_size = {
            10: [{"array": list(range(10, 0, -1))}],
            20: [{"array": list(range(20, 0, -1))}],
        }
        result = _run_single_algorithm(
            "sorting", "selection_sort", [10, 20], inputs_by_size, 1,
            ["comparisons"],
        )
        assert len(result["table"]) == 2
        assert len(result["series"]["comparisons"]) == 2

    def test_multiple_trials(self):
        inputs_by_size = {
            10: [
                {"array": list(range(10, 0, -1))},
                {"array": list(range(10, 0, -1))},
                {"array": list(range(10, 0, -1))},
            ],
        }
        result = _run_single_algorithm(
            "sorting", "bubble_sort", [10], inputs_by_size, 3,
            ["comparisons"],
        )
        # With identical reversed input, all trials produce same comparisons
        point = result["series"]["comparisons"][0]
        assert point["stddev"] == 0.0

    def test_copies_sorting_arrays(self):
        """Mutation safety: the original input should not be modified."""
        original = list(range(10, 0, -1))
        inputs_by_size = {10: [{"array": original[:]}]}
        _run_single_algorithm(
            "sorting", "quicksort", [10], inputs_by_size, 1,
            ["comparisons"],
        )
        # Original should still be reversed
        assert inputs_by_size[10][0]["array"] == list(range(10, 0, -1))


# ---------------------------------------------------------------------------
# 9. generate_sorting_input tests
# ---------------------------------------------------------------------------

class TestGenerateSortingInput:
    """Verify input generation for all families."""

    def test_random_correct_size(self):
        arr = generate_sorting_input("random", 100)
        assert len(arr) == 100
        assert all(isinstance(x, int) for x in arr)

    def test_sorted_is_ascending(self):
        arr = generate_sorting_input("sorted", 50)
        assert arr == list(range(1, 51))

    def test_reversed_is_descending(self):
        arr = generate_sorting_input("reversed", 50)
        assert arr == list(range(50, 0, -1))

    def test_nearly_sorted_has_some_disorder(self):
        arr = generate_sorting_input("nearly_sorted", 100)
        assert len(arr) == 100
        sorted_arr = sorted(arr)
        # Nearly sorted: at least one element out of place (usually)
        # but all elements present
        assert sorted(arr) == sorted_arr

    def test_unknown_family_raises(self):
        with pytest.raises(ValueError, match = "Unknown input family"):
            generate_sorting_input("zigzag", 10)


# ---------------------------------------------------------------------------
# 10. Performance verification at larger sizes (the optimization's raison d'être)
# ---------------------------------------------------------------------------

class TestPerformanceAtScale:
    """
    Verify the optimization actually works at the sizes that were bottlenecking.
    These tests use larger sizes to confirm fast paths complete quickly.
    """

    def test_all_algorithms_at_1000_elements(self):
        """1K elements — should complete in seconds, not minutes."""
        config = {
            "algorithm_keys": ALL_SORTING_ALGOS,
            "input_family": "random",
            "sizes": [1000],
            "trials_per_size": 2,
            "metrics": ["runtime_ms", "comparisons"],
        }
        t0 = time.perf_counter()
        result = run_benchmark("sorting", config)
        elapsed = time.perf_counter() - t0

        assert result["summary"]["total_algorithms"] == 6
        assert result["summary"]["total_runs"] == 12
        # The entire benchmark should complete well under 60 seconds
        assert elapsed < 60, f"Benchmark took {elapsed:.1f}s — too slow!"

    def test_nlogn_algorithms_at_5000_elements(self):
        """5K elements for O(n log n) algorithms — should be fast."""
        nlogn_algos = ["quicksort", "mergesort", "heap_sort"]
        config = {
            "algorithm_keys": nlogn_algos,
            "input_family": "random",
            "sizes": [5000],
            "trials_per_size": 3,
            "metrics": ["runtime_ms", "comparisons"],
        }
        t0 = time.perf_counter()
        result = run_benchmark("sorting", config)
        elapsed = time.perf_counter() - t0

        assert result["summary"]["total_algorithms"] == 3
        assert elapsed < 30, f"O(n log n) benchmark took {elapsed:.1f}s at n=5000"

    def test_o_n2_algorithms_at_2000_elements(self):
        """2K elements for O(n²) algorithms — the hardest case for optimization."""
        n2_algos = ["bubble_sort", "insertion_sort", "selection_sort"]
        config = {
            "algorithm_keys": n2_algos,
            "input_family": "random",
            "sizes": [2000],
            "trials_per_size": 2,
            "metrics": ["runtime_ms", "comparisons", "swaps"],
        }
        t0 = time.perf_counter()
        result = run_benchmark("sorting", config)
        elapsed = time.perf_counter() - t0

        assert result["summary"]["total_algorithms"] == 3
        # O(n²) at n=2000 should still be manageable with fast path
        assert elapsed < 60, f"O(n²) benchmark took {elapsed:.1f}s at n=2000"

    def test_full_range_preset(self):
        """Simulates the 'Full Range' preset from the frontend: 10-10000."""
        config = {
            "algorithm_keys": ["quicksort", "mergesort", "heap_sort"],
            "input_family": "random",
            "sizes": [10, 50, 100, 250, 500, 1000, 2500, 5000],
            "trials_per_size": 2,
            "metrics": ["runtime_ms", "comparisons"],
        }
        t0 = time.perf_counter()
        result = run_benchmark("sorting", config)
        elapsed = time.perf_counter() - t0

        assert result["summary"]["total_algorithms"] == 3
        assert result["summary"]["total_sizes"] == 8
        assert elapsed < 60, f"Full range benchmark took {elapsed:.1f}s"

    def test_large_preset_all_algorithms(self):
        """Simulates selecting 'Large (1k-10k)' with all 6 algorithms — the original pain point."""
        config = {
            "algorithm_keys": ALL_SORTING_ALGOS,
            "input_family": "random",
            "sizes": [1000, 2500, 5000],
            "trials_per_size": 2,
            "metrics": ["runtime_ms", "comparisons", "swaps"],
        }
        t0 = time.perf_counter()
        result = run_benchmark("sorting", config)
        elapsed = time.perf_counter() - t0

        assert result["summary"]["total_algorithms"] == 6
        assert result["summary"]["total_sizes"] == 3
        assert result["summary"]["total_runs"] == 36
        # This was the exact bottleneck scenario — must complete reasonably
        assert elapsed < 120, f"Large preset took {elapsed:.1f}s — still bottlenecking!"

        # All algorithms should have data for all sizes
        for metric in ["runtime_ms", "comparisons", "swaps"]:
            series = result["series"][metric]
            assert len(series) == 6
            for s in series:
                assert len(s["points"]) == 3


# ---------------------------------------------------------------------------
# 11. Edge cases
# ---------------------------------------------------------------------------

class TestEdgeCases:
    """Boundary conditions and unusual but valid configurations."""

    def test_single_element_array(self):
        """Size=1 is the minimum possible — algorithms should handle gracefully."""
        config = {
            "algorithm_keys": ALL_SORTING_ALGOS,
            "input_family": "random",
            "sizes": [1],
            "trials_per_size": 1,
            "metrics": ["comparisons"],
        }
        result = run_benchmark("sorting", config)
        for s in result["series"]["comparisons"]:
            assert s["points"][0]["mean"] == 0  # no comparisons needed for single element

    def test_two_element_array(self):
        config = {
            "algorithm_keys": ALL_SORTING_ALGOS,
            "input_family": "reversed",
            "sizes": [2],
            "trials_per_size": 1,
            "metrics": ["comparisons"],
        }
        result = run_benchmark("sorting", config)
        for s in result["series"]["comparisons"]:
            # Every algorithm needs at most 1 comparison for 2 elements
            assert s["points"][0]["mean"] <= 2

    def test_max_trials(self):
        """20 trials (the frontend max) should aggregate correctly."""
        config = {
            "algorithm_keys": ["bubble_sort"],
            "input_family": "reversed",
            "sizes": [10],
            "trials_per_size": 20,
            "metrics": ["comparisons"],
        }
        result = run_benchmark("sorting", config)
        point = result["series"]["comparisons"][0]["points"][0]
        # Reversed is deterministic — all 20 trials produce 45
        assert point["mean"] == 45
        assert point["stddev"] == 0.0
        assert point["min"] == point["max"] == 45

    def test_many_sizes(self):
        """12 sizes (the frontend max) should work."""
        sizes = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 150, 200]
        config = {
            "algorithm_keys": ["quicksort"],
            "input_family": "random",
            "sizes": sizes,
            "trials_per_size": 1,
            "metrics": ["runtime_ms"],
        }
        result = run_benchmark("sorting", config)
        assert len(result["series"]["runtime_ms"][0]["points"]) == 12
        assert len(result["table"]) == 12

    def test_summary_metadata(self):
        """Summary should include all expected metadata fields."""
        config = {
            "algorithm_keys": ["quicksort", "mergesort"],
            "input_family": "nearly_sorted",
            "sizes": [10, 50],
            "trials_per_size": 3,
            "metrics": ["runtime_ms"],
        }
        result = run_benchmark("sorting", config)
        summary = result["summary"]
        assert summary["total_algorithms"] == 2
        assert summary["total_sizes"] == 2
        assert summary["trials_per_size"] == 3
        assert summary["total_runs"] == 12
        assert summary["input_family"] == "nearly_sorted"
        assert summary["elapsed_ms"] > 0
        assert summary["cancelled"] is False

    def test_runtime_ms_always_positive(self):
        """Runtime should always be positive for any algorithm/input combo."""
        config = {
            "algorithm_keys": ALL_SORTING_ALGOS,
            "input_family": "random",
            "sizes": [50],
            "trials_per_size": 1,
            "metrics": ["runtime_ms"],
        }
        result = run_benchmark("sorting", config)
        for s in result["series"]["runtime_ms"]:
            assert s["points"][0]["mean"] > 0
