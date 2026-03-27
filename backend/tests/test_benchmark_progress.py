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

    # 2 algorithms x 2 sizes = 4 combos
    assert callback.call_count == 4

    # Each call receives (completed_runs, total_runs)
    # total_runs = 2 algos * 2 sizes * 2 trials = 8
    calls = [c.args for c in callback.call_args_list]
    assert calls[0] == (2, 8)    # quicksort @ size 10: 2 trials done
    assert calls[1] == (4, 8)    # quicksort @ size 20: 4 trials done
    assert calls[2] == (6, 8)    # mergesort @ size 10: 6 trials done
    assert calls[3] == (8, 8)    # mergesort @ size 20: 8 trials done

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
