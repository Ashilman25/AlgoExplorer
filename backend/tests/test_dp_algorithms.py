import pytest

from app.algorithms.dp.edit_distance import EditDistanceAlgorithm
from app.algorithms.dp.lcs import LCSAlgorithm
from app.exceptions import DomainError
from app.simulation.types import AlgorithmInput


def build_input(payload: dict) -> AlgorithmInput:
    return AlgorithmInput(
        input_payload=payload,
        execution_mode="simulate",
        explanation_level="standard",
    )


def assert_common_metadata(metadata: dict, algorithm_key: str, string1_length: int, string2_length: int) -> None:
    assert metadata["module_type"] == "dp"
    assert metadata["algorithm_key"] == algorithm_key
    assert metadata["execution_mode"] == "simulate"
    assert metadata["explanation_level"] == "standard"
    assert metadata["config"] == {}
    assert metadata["string1_length"] == string1_length
    assert metadata["string2_length"] == string2_length


def is_subsequence(candidate: str, source: str) -> bool:
    cursor = 0
    for char in source:
        if cursor < len(candidate) and candidate[cursor] == char:
            cursor += 1
    return cursor == len(candidate)


def test_lcs_returns_valid_longest_common_subsequence():
    output = LCSAlgorithm().run(
        build_input({"string1": "ABCDEF", "string2": "ACBDFE"})
    )

    lcs = output.final_result["lcs"]
    assert len(lcs) == 4
    assert output.final_result["lcs_length"] == 4
    assert output.final_result["table_dimensions"] == [7, 7]
    assert is_subsequence(lcs, "ABCDEF")
    assert is_subsequence(lcs, "ACBDFE")
    assert output.summary_metrics["cells_computed"] == 36
    assert output.summary_metrics["traceback_length"] == 8
    assert output.timeline_steps[0].event_type == "initialize"
    assert output.timeline_steps[-1].event_type == "complete"
    assert output.timeline_steps[-1].metrics_snapshot == output.summary_metrics
    assert_common_metadata(output.algorithm_metadata, "lcs", 6, 6)
    assert output.algorithm_metadata["time_complexity"] == "O(m × n)"
    assert output.algorithm_metadata["space_complexity"] == "O(m × n)"


def test_edit_distance_returns_min_distance_and_forward_operations():
    output = EditDistanceAlgorithm().run(
        build_input({"string1": "kitten", "string2": "sitting"})
    )

    assert output.final_result["edit_distance"] == 3
    assert output.final_result["table_dimensions"] == [7, 8]
    assert output.final_result["operations"] == [
        "replace 'k' → 's'",
        "keep 'i'",
        "keep 't'",
        "keep 't'",
        "replace 'e' → 'i'",
        "keep 'n'",
        "insert 'g'",
    ]
    assert output.summary_metrics["cells_computed"] == 42
    assert output.summary_metrics["edit_distance"] == 3
    assert output.summary_metrics["traceback_length"] == 7
    assert output.timeline_steps[0].event_type == "initialize"
    assert output.timeline_steps[-1].event_type == "complete"
    assert output.timeline_steps[-1].metrics_snapshot == output.summary_metrics
    assert_common_metadata(output.algorithm_metadata, "edit_distance", 6, 7)
    assert output.algorithm_metadata["time_complexity"] == "O(m × n)"
    assert output.algorithm_metadata["space_complexity"] == "O(m × n)"


def test_lcs_handles_one_empty_string():
    output = LCSAlgorithm().run(build_input({"string1": "", "string2": "ABC"}))

    assert output.final_result["lcs"] == ""
    assert output.final_result["lcs_length"] == 0
    assert output.final_result["table_dimensions"] == [1, 4]
    assert output.summary_metrics["cells_computed"] == 0
    assert output.summary_metrics["traceback_length"] == 0
    assert len(output.timeline_steps) == 3
    assert_common_metadata(output.algorithm_metadata, "lcs", 0, 3)


def test_edit_distance_handles_identical_strings():
    output = EditDistanceAlgorithm().run(
        build_input({"string1": "abc", "string2": "abc"})
    )

    assert output.final_result["edit_distance"] == 0
    assert output.final_result["operations"] == [
        "keep 'a'",
        "keep 'b'",
        "keep 'c'",
    ]
    assert output.final_result["table_dimensions"] == [4, 4]
    assert output.summary_metrics["edit_distance"] == 0
    assert output.summary_metrics["matches"] == 3
    assert output.summary_metrics["traceback_length"] == 3
    assert_common_metadata(output.algorithm_metadata, "edit_distance", 3, 3)


@pytest.mark.parametrize(
    ("algorithm_cls", "payload", "message"),
    [
        (LCSAlgorithm, {"string1": "ABC"}, "Invalid LCS input."),
        (EditDistanceAlgorithm, {"string1": "ABC"}, "Invalid Edit Distance input."),
    ],
)
def test_dp_algorithms_fail_cleanly_on_invalid_input(algorithm_cls, payload, message):
    with pytest.raises(DomainError, match=message):
        algorithm_cls().run(build_input(payload))
