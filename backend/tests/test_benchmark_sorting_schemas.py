import re
import pytest
from pydantic import ValidationError

from app.schemas.benchmarks import CreateBenchmarkRequest, UpdateBenchmarkStatusRequest


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


ALL_SORTING_ALGOS = [
    "quicksort", "mergesort", "bubble_sort",
    "insertion_sort", "selection_sort", "heap_sort",
]


def test_all_sorting_algorithms_accepted_individually():
    for algo in ALL_SORTING_ALGOS:
        req = CreateBenchmarkRequest(**_base_sorting(algorithm_keys = [algo]))
        assert req.algorithm_keys == [algo]


def test_all_sorting_algorithms_accepted_together():
    req = CreateBenchmarkRequest(**_base_sorting(
        algorithm_keys = ALL_SORTING_ALGOS[:5],
        metrics = ["runtime_ms", "comparisons"],
    ))
    assert len(req.algorithm_keys) == 5


def test_search_algorithms_rejected():
    for algo in ["binary_search", "linear_search"]:
        with pytest.raises(ValidationError, match = re.compile(r"not supported.*sorting", re.IGNORECASE)):
            CreateBenchmarkRequest(**_base_sorting(algorithm_keys = [algo]))


def test_unknown_sorting_algorithm_rejected():
    with pytest.raises(ValidationError, match = re.compile(r"not supported.*sorting", re.IGNORECASE)):
        CreateBenchmarkRequest(**_base_sorting(algorithm_keys = ["bogosort"]))


def test_cancelled_status_accepted():
    req = UpdateBenchmarkStatusRequest(status = "cancelled", progress = 0.5)
    assert req.status == "cancelled"


def test_cancelling_status_accepted():
    req = UpdateBenchmarkStatusRequest(status = "cancelling", progress = 0.3)
    assert req.status == "cancelling"
