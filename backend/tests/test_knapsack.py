import pytest

from app.algorithms.dp.knapsack import KnapsackAlgorithm
from app.exceptions import DomainError
from app.simulation.types import AlgorithmInput


def build_input(payload: dict) -> AlgorithmInput:
    return AlgorithmInput(
        input_payload = payload,
        execution_mode = "simulate",
        explanation_level = "standard",
    )


def test_knapsack_selects_optimal_items():
    output = KnapsackAlgorithm().run(build_input({
        "capacity": 10,
        "items": [
            {"weight": 2, "value": 3},
            {"weight": 3, "value": 4},
            {"weight": 4, "value": 5},
            {"weight": 5, "value": 6},
        ],
    }))

    assert output.final_result["optimal_value"] == 13
    assert output.final_result["total_weight"] <= 10
    assert len(output.final_result["selected_items"]) > 0
    assert output.final_result["table_dimensions"] == [5, 11]
    assert output.summary_metrics["cells_computed"] == 40
    assert output.summary_metrics["table_rows"] == 5
    assert output.summary_metrics["table_cols"] == 11
    assert output.summary_metrics["total_value"] == 13
    assert output.summary_metrics["items_selected"] > 0
    assert output.summary_metrics["runtime_ms"] >= 0
    assert output.timeline_steps[0].event_type == "initialize"
    assert output.timeline_steps[-1].event_type == "complete"
    assert output.timeline_steps[-1].metrics_snapshot == output.summary_metrics
    assert output.algorithm_metadata["module_type"] == "dp"
    assert output.algorithm_metadata["algorithm_key"] == "knapsack_01"
    assert output.algorithm_metadata["time_complexity"] == "O(nW)"
    assert output.algorithm_metadata["space_complexity"] == "O(nW)"


def test_knapsack_single_item_fits():
    output = KnapsackAlgorithm().run(build_input({
        "capacity": 5,
        "items": [{"weight": 3, "value": 10}],
    }))

    assert output.final_result["optimal_value"] == 10
    assert output.final_result["total_weight"] == 3
    assert output.final_result["selected_items"] == [0]


def test_knapsack_single_item_too_heavy():
    output = KnapsackAlgorithm().run(build_input({
        "capacity": 2,
        "items": [{"weight": 3, "value": 10}],
    }))

    assert output.final_result["optimal_value"] == 0
    assert output.final_result["total_weight"] == 0
    assert output.final_result["selected_items"] == []


def test_knapsack_all_items_fit():
    output = KnapsackAlgorithm().run(build_input({
        "capacity": 100,
        "items": [
            {"weight": 1, "value": 5},
            {"weight": 2, "value": 10},
            {"weight": 3, "value": 15},
        ],
    }))

    assert output.final_result["optimal_value"] == 30
    assert output.final_result["total_weight"] == 6
    assert len(output.final_result["selected_items"]) == 3


def test_knapsack_timeline_has_correct_event_sequence():
    output = KnapsackAlgorithm().run(build_input({
        "capacity": 5,
        "items": [{"weight": 2, "value": 3}, {"weight": 3, "value": 4}],
    }))

    event_types = [s.event_type for s in output.timeline_steps]
    assert event_types[0] == "initialize"
    assert "compute_cell" in event_types
    assert "fill_cell" in event_types
    assert "row_complete" in event_types
    assert "traceback_start" in event_types
    assert event_types[-1] == "complete"


def test_knapsack_fails_on_invalid_input():
    with pytest.raises(DomainError, match = "Invalid knapsack_01 input"):
        KnapsackAlgorithm().run(build_input({"capacity": 10}))
