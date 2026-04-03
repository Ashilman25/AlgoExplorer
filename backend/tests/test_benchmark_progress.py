from unittest.mock import MagicMock
from app.benchmark.service import run_benchmark


def test_progress_callback_called_for_each_algo_size_combo():
    callback = MagicMock()

    config = {
        "algorithm_keys": ["quicksort", "mergesort"],
        "input_family": "random",
        "sizes": [10, 20],
        "trials_per_size": 2,
        "metrics": ["runtime_ms"],
    }

    result = run_benchmark("sorting", config, progress_callback = callback)

    # With parallel execution, callback fires per-algorithm completion
    # 2 algorithms = 2 calls
    assert callback.call_count == 2

    # Each call reports completed trials: algo completes = sizes * trials done
    # total_runs = 2 algos * 2 sizes * 2 trials = 8
    calls = [c.args for c in callback.call_args_list]
    # Order is non-deterministic with parallel execution, but final call should be (8, 8)
    total_runs_reported = [c[1] for c in calls]
    assert all(t == 8 for t in total_runs_reported)
    completed_runs = sorted([c[0] for c in calls])
    assert completed_runs == [4, 8]

    assert result["summary"]["total_runs"] == 8


def test_no_callback_still_works():
    config = {
        "algorithm_keys": ["quicksort"],
        "input_family": "random",
        "sizes": [10],
        "trials_per_size": 1,
        "metrics": ["runtime_ms"],
    }

    result = run_benchmark("sorting", config)
    assert result["summary"]["total_runs"] == 1
