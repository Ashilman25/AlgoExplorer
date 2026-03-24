import pytest

from app.algorithms.sorting.mergesort import MergeSortAlgorithm
from app.algorithms.sorting.quicksort import QuickSortAlgorithm
from app.exceptions import DomainError
from app.simulation.types import AlgorithmInput


SORTING_PAYLOAD = {
    "array": [5, 3, 8, 1, 4],
    "preset": "custom",
    "duplicate_density": "none",
    "animation_max_size": 200,
}


def build_input(payload: dict) -> AlgorithmInput:
    return AlgorithmInput(
        input_payload=payload,
        execution_mode="simulate",
        explanation_level="standard",
    )


def assert_common_metadata(metadata: dict, algorithm_key: str) -> None:
    assert metadata["module_type"] == "sorting"
    assert metadata["algorithm_key"] == algorithm_key
    assert metadata["execution_mode"] == "simulate"
    assert metadata["explanation_level"] == "standard"
    assert metadata["config"] == {}


def test_quicksort_sorts_array_and_tracks_expected_metrics():
    output = QuickSortAlgorithm().run(build_input(SORTING_PAYLOAD))

    assert output.final_result == {
        "sorted_array": [1, 3, 4, 5, 8],
        "comparisons": 6,
        "swaps": 4,
        "max_recursion_depth": 2,
    }
    assert output.summary_metrics["comparisons"] == 6
    assert output.summary_metrics["swaps"] == 4
    assert output.summary_metrics["writes"] == 0
    assert output.summary_metrics["array_length"] == 5
    assert output.summary_metrics["max_recursion_depth"] == 2
    assert output.summary_metrics["runtime_ms"] >= 0
    assert len(output.timeline_steps) == 23
    assert output.timeline_steps[0].event_type == "initialize"
    assert output.timeline_steps[-1].event_type == "complete"
    assert output.timeline_steps[-1].metrics_snapshot == output.summary_metrics
    assert_common_metadata(output.algorithm_metadata, "quicksort")
    assert output.algorithm_metadata["partition_scheme"] == "lomuto"
    assert output.algorithm_metadata["array_size"] == 5


def test_mergesort_sorts_array_and_tracks_expected_metrics():
    output = MergeSortAlgorithm().run(build_input(SORTING_PAYLOAD))

    assert output.final_result == {
        "sorted_array": [1, 3, 4, 5, 8],
        "comparisons": 7,
        "writes": 12,
        "max_recursion_depth": 3,
    }
    assert output.summary_metrics["comparisons"] == 7
    assert output.summary_metrics["swaps"] == 0
    assert output.summary_metrics["writes"] == 12
    assert output.summary_metrics["array_length"] == 5
    assert output.summary_metrics["max_recursion_depth"] == 3
    assert output.summary_metrics["runtime_ms"] >= 0
    assert len(output.timeline_steps) == 34
    assert output.timeline_steps[0].event_type == "initialize"
    assert output.timeline_steps[-1].event_type == "complete"
    assert output.timeline_steps[-1].metrics_snapshot == output.summary_metrics
    assert_common_metadata(output.algorithm_metadata, "mergesort")
    assert output.algorithm_metadata["stable"] is True
    assert output.algorithm_metadata["array_size"] == 5


@pytest.mark.parametrize(
    ("algorithm_cls", "expected_result", "expected_summary"),
    [
        (
            QuickSortAlgorithm,
            {"sorted_array": [1, 3, 4, 5, 8], "comparisons": 6, "swaps": 4, "max_recursion_depth": 2},
            {"comparisons": 6, "swaps": 4, "writes": 0, "array_length": 5},
        ),
        (
            MergeSortAlgorithm,
            {"sorted_array": [1, 3, 4, 5, 8], "comparisons": 7, "writes": 12, "max_recursion_depth": 3},
            {"comparisons": 7, "swaps": 0, "writes": 12, "array_length": 5},
        ),
    ],
)
def test_sorting_algorithms_skip_timeline_generation_in_benchmark_mode(
    algorithm_cls, expected_result, expected_summary
):
    output = algorithm_cls().run(
        AlgorithmInput(
            input_payload=SORTING_PAYLOAD,
            execution_mode="benchmark",
            explanation_level="none",
        )
    )

    assert output.timeline_steps == []
    assert output.final_result == expected_result
    for key, value in expected_summary.items():
        assert output.summary_metrics[key] == value
    assert output.summary_metrics["runtime_ms"] >= 0
    assert output.algorithm_metadata["execution_mode"] == "benchmark"
    assert output.algorithm_metadata["explanation_level"] == "none"


@pytest.mark.parametrize(
    ("algorithm_cls", "payload", "message"),
    [
        (
            QuickSortAlgorithm,
            {"array": "bad", "preset": "custom", "duplicate_density": "none", "animation_max_size": 200},
            "Invalid sorting input.",
        ),
        (
            MergeSortAlgorithm,
            {"preset": "custom", "duplicate_density": "none", "animation_max_size": 200},
            "Invalid sorting input.",
        ),
    ],
)
def test_sorting_algorithms_fail_cleanly_on_invalid_input(algorithm_cls, payload, message):
    with pytest.raises(DomainError, match=message):
        algorithm_cls().run(build_input(payload))
