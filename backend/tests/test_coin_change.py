import pytest

from app.algorithms.dp.coin_change import CoinChangeAlgorithm
from app.exceptions import DomainError
from app.simulation.types import AlgorithmInput


def build_input(payload: dict) -> AlgorithmInput:
    return AlgorithmInput(
        input_payload = payload,
        execution_mode = "simulate",
        explanation_level = "standard",
    )


def test_coin_change_finds_minimum_coins():
    output = CoinChangeAlgorithm().run(build_input({
        "coins": [1, 5, 10, 25],
        "target": 41,
    }))

    assert output.final_result["min_coins"] == 4
    assert output.final_result["target"] == 41
    assert sum(output.final_result["coins_used_list"]) == 41
    assert output.summary_metrics["cells_computed"] == 41
    assert output.summary_metrics["array_length"] == 42
    assert output.summary_metrics["min_coins"] == 4
    assert output.summary_metrics["runtime_ms"] >= 0
    assert output.timeline_steps[0].event_type == "initialize"
    assert output.timeline_steps[-1].event_type == "complete"
    assert output.timeline_steps[-1].metrics_snapshot == output.summary_metrics
    assert output.algorithm_metadata["module_type"] == "dp"
    assert output.algorithm_metadata["algorithm_key"] == "coin_change"
    assert output.algorithm_metadata["time_complexity"] == "O(target x coins)"
    assert output.algorithm_metadata["space_complexity"] == "O(target)"


def test_coin_change_greedy_fails_case():
    output = CoinChangeAlgorithm().run(build_input({
        "coins": [1, 3, 4],
        "target": 6,
    }))

    assert output.final_result["min_coins"] == 2
    assert output.final_result["coins_used_list"] == [3, 3]


def test_coin_change_impossible_target():
    output = CoinChangeAlgorithm().run(build_input({
        "coins": [3, 7],
        "target": 5,
    }))

    assert output.final_result["min_coins"] is None
    assert output.final_result["coins_used_list"] == []
    assert output.summary_metrics["min_coins"] is None
    assert output.timeline_steps[-1].event_type == "complete"


def test_coin_change_target_equals_single_coin():
    output = CoinChangeAlgorithm().run(build_input({
        "coins": [1, 5, 10],
        "target": 10,
    }))

    assert output.final_result["min_coins"] == 1
    assert output.final_result["coins_used_list"] == [10]


def test_coin_change_timeline_uses_1d_state_payload():
    output = CoinChangeAlgorithm().run(build_input({
        "coins": [1, 3],
        "target": 4,
    }))

    step = output.timeline_steps[0]
    payload = step.state_payload
    assert "array" in payload
    assert "cell_states" in payload
    assert isinstance(payload["array"], list)
    assert not isinstance(payload["array"][0], list)  # 1D, not 2D


def test_coin_change_fails_on_invalid_input():
    with pytest.raises(DomainError, match = "Invalid coin_change input"):
        CoinChangeAlgorithm().run(build_input({"coins": [1]}))
