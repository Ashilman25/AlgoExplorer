import pytest

from app.algorithms.sorting.binary_search import BinarySearchAlgorithm
from app.algorithms.sorting.linear_search import LinearSearchAlgorithm
from app.algorithms.sorting.bubble_sort import BubbleSortAlgorithm
from app.algorithms.sorting.heap_sort import HeapSortAlgorithm
from app.algorithms.sorting.insertion_sort import InsertionSortAlgorithm
from app.algorithms.sorting.mergesort import MergeSortAlgorithm
from app.algorithms.sorting.quicksort import QuickSortAlgorithm
from app.algorithms.sorting.selection_sort import SelectionSortAlgorithm
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


def test_bubble_sort_sorts_array_and_tracks_expected_metrics():
    output = BubbleSortAlgorithm().run(build_input(SORTING_PAYLOAD))
    assert output.final_result["sorted_array"] == [1, 3, 4, 5, 8]
    assert output.summary_metrics["comparisons"] > 0
    assert output.summary_metrics["swaps"] > 0
    assert output.summary_metrics["passes"] > 0
    assert output.summary_metrics["array_length"] == 5
    assert output.summary_metrics["runtime_ms"] >= 0
    assert len(output.timeline_steps) > 0
    assert output.timeline_steps[0].event_type == "initialize"
    assert output.timeline_steps[-1].event_type == "complete"
    assert output.timeline_steps[-1].metrics_snapshot == output.summary_metrics
    assert_common_metadata(output.algorithm_metadata, "bubble_sort")
    assert output.algorithm_metadata["array_size"] == 5


def test_bubble_sort_skips_timeline_in_benchmark_mode():
    output = BubbleSortAlgorithm().run(
        AlgorithmInput(
            input_payload=SORTING_PAYLOAD,
            execution_mode="benchmark",
            explanation_level="none",
        )
    )
    assert output.timeline_steps == []
    assert output.final_result["sorted_array"] == [1, 3, 4, 5, 8]


def test_bubble_sort_early_terminates_on_sorted_input():
    payload = {**SORTING_PAYLOAD, "array": [1, 2, 3, 4, 5]}
    output = BubbleSortAlgorithm().run(build_input(payload))
    assert output.final_result["sorted_array"] == [1, 2, 3, 4, 5]
    assert output.summary_metrics["swaps"] == 0
    assert output.summary_metrics["passes"] == 1


def test_insertion_sort_sorts_array_and_tracks_expected_metrics():
    output = InsertionSortAlgorithm().run(build_input(SORTING_PAYLOAD))
    assert output.final_result["sorted_array"] == [1, 3, 4, 5, 8]
    assert output.summary_metrics["comparisons"] > 0
    assert output.summary_metrics["shifts"] >= 0
    assert output.summary_metrics["writes"] > 0
    assert output.summary_metrics["array_length"] == 5
    assert output.summary_metrics["runtime_ms"] >= 0
    assert len(output.timeline_steps) > 0
    assert output.timeline_steps[0].event_type == "initialize"
    assert output.timeline_steps[-1].event_type == "complete"
    assert output.timeline_steps[-1].metrics_snapshot == output.summary_metrics
    assert_common_metadata(output.algorithm_metadata, "insertion_sort")
    assert output.algorithm_metadata["array_size"] == 5


def test_insertion_sort_skips_timeline_in_benchmark_mode():
    output = InsertionSortAlgorithm().run(
        AlgorithmInput(
            input_payload=SORTING_PAYLOAD,
            execution_mode="benchmark",
            explanation_level="none",
        )
    )
    assert output.timeline_steps == []
    assert output.final_result["sorted_array"] == [1, 3, 4, 5, 8]


def test_insertion_sort_handles_already_sorted_efficiently():
    payload = {**SORTING_PAYLOAD, "array": [1, 2, 3, 4, 5]}
    output = InsertionSortAlgorithm().run(build_input(payload))
    assert output.final_result["sorted_array"] == [1, 2, 3, 4, 5]
    assert output.summary_metrics["shifts"] == 0


def test_selection_sort_sorts_array_and_tracks_expected_metrics():
    output = SelectionSortAlgorithm().run(build_input(SORTING_PAYLOAD))
    assert output.final_result["sorted_array"] == [1, 3, 4, 5, 8]
    assert output.summary_metrics["comparisons"] > 0
    assert output.summary_metrics["swaps"] >= 0
    assert output.summary_metrics["array_length"] == 5
    assert output.summary_metrics["runtime_ms"] >= 0
    assert len(output.timeline_steps) > 0
    assert output.timeline_steps[0].event_type == "initialize"
    assert output.timeline_steps[-1].event_type == "complete"
    assert output.timeline_steps[-1].metrics_snapshot == output.summary_metrics
    assert_common_metadata(output.algorithm_metadata, "selection_sort")
    assert output.algorithm_metadata["array_size"] == 5


def test_selection_sort_skips_timeline_in_benchmark_mode():
    output = SelectionSortAlgorithm().run(
        AlgorithmInput(
            input_payload=SORTING_PAYLOAD,
            execution_mode="benchmark",
            explanation_level="none",
        )
    )
    assert output.timeline_steps == []
    assert output.final_result["sorted_array"] == [1, 3, 4, 5, 8]


def test_selection_sort_always_does_n_choose_2_comparisons():
    payload = {**SORTING_PAYLOAD, "array": [1, 2, 3, 4, 5]}
    output = SelectionSortAlgorithm().run(build_input(payload))
    assert output.final_result["sorted_array"] == [1, 2, 3, 4, 5]
    assert output.summary_metrics["comparisons"] == 10  # 5*4/2


def test_heap_sort_sorts_array_and_tracks_expected_metrics():
    output = HeapSortAlgorithm().run(build_input(SORTING_PAYLOAD))
    assert output.final_result["sorted_array"] == [1, 3, 4, 5, 8]
    assert output.summary_metrics["comparisons"] > 0
    assert output.summary_metrics["swaps"] > 0
    assert output.summary_metrics["heapify_ops"] > 0
    assert output.summary_metrics["array_length"] == 5
    assert output.summary_metrics["runtime_ms"] >= 0
    assert len(output.timeline_steps) > 0
    assert output.timeline_steps[0].event_type == "initialize"
    assert output.timeline_steps[-1].event_type == "complete"
    assert output.timeline_steps[-1].metrics_snapshot == output.summary_metrics
    assert_common_metadata(output.algorithm_metadata, "heap_sort")
    assert output.algorithm_metadata["array_size"] == 5


def test_heap_sort_skips_timeline_in_benchmark_mode():
    output = HeapSortAlgorithm().run(
        AlgorithmInput(
            input_payload=SORTING_PAYLOAD,
            execution_mode="benchmark",
            explanation_level="none",
        )
    )
    assert output.timeline_steps == []
    assert output.final_result["sorted_array"] == [1, 3, 4, 5, 8]


def test_heap_sort_handles_duplicates():
    payload = {**SORTING_PAYLOAD, "array": [3, 1, 3, 1, 2]}
    output = HeapSortAlgorithm().run(build_input(payload))
    assert output.final_result["sorted_array"] == [1, 1, 2, 3, 3]


SEARCH_PAYLOAD = {
    "array": [1, 3, 4, 5, 8],
    "preset": "custom",
    "duplicate_density": "none",
    "animation_max_size": 200,
    "target": 4,
}


def test_binary_search_finds_target():
    output = BinarySearchAlgorithm().run(build_input(SEARCH_PAYLOAD))
    assert output.final_result["found"] is True
    assert output.final_result["found_index"] == 2
    assert output.final_result["target"] == 4
    assert output.summary_metrics["comparisons"] > 0
    assert output.summary_metrics["iterations"] > 0
    assert output.summary_metrics["array_length"] == 5
    assert output.summary_metrics["runtime_ms"] >= 0
    assert len(output.timeline_steps) > 0
    assert output.timeline_steps[0].event_type == "initialize"
    assert output.timeline_steps[-1].event_type == "complete"
    assert_common_metadata(output.algorithm_metadata, "binary_search")


def test_binary_search_not_found():
    payload = {**SEARCH_PAYLOAD, "target": 6}
    output = BinarySearchAlgorithm().run(build_input(payload))
    assert output.final_result["found"] is False
    assert output.final_result["found_index"] is None
    assert output.final_result["target"] == 6


def test_binary_search_finds_first_element():
    payload = {**SEARCH_PAYLOAD, "target": 1}
    output = BinarySearchAlgorithm().run(build_input(payload))
    assert output.final_result["found"] is True
    assert output.final_result["found_index"] == 0


def test_binary_search_finds_last_element():
    payload = {**SEARCH_PAYLOAD, "target": 8}
    output = BinarySearchAlgorithm().run(build_input(payload))
    assert output.final_result["found"] is True
    assert output.final_result["found_index"] == 4


def test_binary_search_skips_timeline_in_benchmark_mode():
    output = BinarySearchAlgorithm().run(
        AlgorithmInput(
            input_payload=SEARCH_PAYLOAD,
            execution_mode="benchmark",
            explanation_level="none",
        )
    )
    assert output.timeline_steps == []
    assert output.final_result["found"] is True
    assert output.final_result["found_index"] == 2


def test_linear_search_finds_target():
    output = LinearSearchAlgorithm().run(build_input(SEARCH_PAYLOAD))
    assert output.final_result["found"] is True
    assert output.final_result["found_index"] == 2
    assert output.final_result["target"] == 4
    assert output.summary_metrics["comparisons"] > 0
    assert output.summary_metrics["array_length"] == 5
    assert output.summary_metrics["runtime_ms"] >= 0
    assert len(output.timeline_steps) > 0
    assert output.timeline_steps[0].event_type == "initialize"
    assert output.timeline_steps[-1].event_type == "complete"
    assert_common_metadata(output.algorithm_metadata, "linear_search")


def test_linear_search_not_found():
    payload = {**SEARCH_PAYLOAD, "target": 99}
    output = LinearSearchAlgorithm().run(build_input(payload))
    assert output.final_result["found"] is False
    assert output.final_result["found_index"] is None
    assert output.summary_metrics["comparisons"] == 5


def test_linear_search_finds_first_element_immediately():
    payload = {**SEARCH_PAYLOAD, "target": 1}
    output = LinearSearchAlgorithm().run(build_input(payload))
    assert output.final_result["found"] is True
    assert output.final_result["found_index"] == 0
    assert output.summary_metrics["comparisons"] == 1


def test_linear_search_skips_timeline_in_benchmark_mode():
    output = LinearSearchAlgorithm().run(
        AlgorithmInput(
            input_payload=SEARCH_PAYLOAD,
            execution_mode="benchmark",
            explanation_level="none",
        )
    )
    assert output.timeline_steps == []
    assert output.final_result["found"] is True
    assert output.final_result["found_index"] == 2
