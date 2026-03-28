import pytest

from app.algorithms.dp.fibonacci import FibonacciAlgorithm
from app.exceptions import DomainError
from app.simulation.types import AlgorithmInput


def build_input(n: int, mode: str = "tabulation") -> AlgorithmInput:
    return AlgorithmInput(
        input_payload = {"n": n},
        algorithm_config = {"mode": mode},
        execution_mode = "simulate",
        explanation_level = "standard",
    )


# --- tabulation mode ---

def test_fib_tabulation_computes_correct_result():
    output = FibonacciAlgorithm().run(build_input(10, "tabulation"))

    assert output.final_result["fib_result"] == 55
    assert output.final_result["fib_n"] == 10
    assert output.final_result["mode"] == "tabulation"
    assert output.summary_metrics["fib_result"] == 55
    # Loop runs from index 3..10 = 8 iterations
    assert output.summary_metrics["total_calls"] == 8
    assert output.summary_metrics["redundant_calls"] == 0
    assert output.summary_metrics["max_depth"] == 0
    assert output.summary_metrics["runtime_ms"] >= 0
    assert output.timeline_steps[0].event_type == "initialize"
    assert output.timeline_steps[-1].event_type == "complete"
    assert output.timeline_steps[-1].metrics_snapshot == output.summary_metrics
    assert output.algorithm_metadata["module_type"] == "dp"
    assert output.algorithm_metadata["algorithm_key"] == "fibonacci"


def test_fib_tabulation_base_cases():
    out1 = FibonacciAlgorithm().run(build_input(1, "tabulation"))
    assert out1.final_result["fib_result"] == 1

    out2 = FibonacciAlgorithm().run(build_input(2, "tabulation"))
    assert out2.final_result["fib_result"] == 1


def test_fib_tabulation_uses_1d_state_payload():
    output = FibonacciAlgorithm().run(build_input(5, "tabulation"))

    step = output.timeline_steps[0]
    payload = step.state_payload
    assert "array" in payload
    assert "cell_states" in payload
    assert isinstance(payload["array"], list)
    assert not isinstance(payload["array"][0], list)  # 1D
    assert payload.get("call_tree") is None


# --- memoized mode ---

def test_fib_memoized_computes_correct_result():
    output = FibonacciAlgorithm().run(build_input(10, "memoized"))

    assert output.final_result["fib_result"] == 55
    assert output.final_result["mode"] == "memoized"
    assert output.summary_metrics["total_calls"] > 0
    assert output.summary_metrics["redundant_calls"] == 0  # memo prevents redundant work
    assert output.summary_metrics["max_depth"] > 0
    assert output.timeline_steps[0].event_type == "initialize"
    assert output.timeline_steps[-1].event_type == "complete"


def test_fib_memoized_has_call_tree_in_payload():
    output = FibonacciAlgorithm().run(build_input(5, "memoized"))

    has_tree = False
    for step in output.timeline_steps:
        ct = step.state_payload.get("call_tree")
        if ct and len(ct["nodes"]) > 0:
            has_tree = True
            node = ct["nodes"][0]
            assert "id" in node
            assert "n" in node
            assert "parent_id" in node
            assert "depth" in node
            break

    assert has_tree, "Memoized mode should include call_tree in state_payload"


# --- naive recursive mode ---

def test_fib_naive_computes_correct_result():
    output = FibonacciAlgorithm().run(build_input(10, "naive_recursive"))

    assert output.final_result["fib_result"] == 55
    assert output.final_result["mode"] == "naive_recursive"
    assert output.summary_metrics["total_calls"] > 10
    assert output.summary_metrics["redundant_calls"] > 0
    assert output.summary_metrics["max_depth"] > 0


def test_fib_naive_has_many_redundant_calls():
    output = FibonacciAlgorithm().run(build_input(10, "naive_recursive"))

    total = output.summary_metrics["total_calls"]
    redundant = output.summary_metrics["redundant_calls"]
    # F(10) naive (base case k<=2): T(n) = T(n-1)+T(n-2)+1 → T(10) = 109
    # Unique subproblems: F(1)..F(10) = 10 → redundant = 109 - 10 = 99
    assert total == 109
    assert redundant == 99


def test_fib_naive_has_only_call_tree_no_array():
    output = FibonacciAlgorithm().run(build_input(5, "naive_recursive"))

    last = output.timeline_steps[-1]
    assert last.state_payload.get("call_tree") is not None
    assert last.state_payload.get("array") is None


# --- all modes agree on result ---

def test_fib_all_modes_produce_same_result():
    for mode in ("tabulation", "memoized", "naive_recursive"):
        output = FibonacciAlgorithm().run(build_input(10, mode))
        assert output.final_result["fib_result"] == 55, f"Mode '{mode}' gave wrong result"


# --- mode caps ---

def test_fib_naive_rejects_n_above_cap():
    with pytest.raises(DomainError, match = "exceeds maximum"):
        FibonacciAlgorithm().run(build_input(20, "naive_recursive"))


def test_fib_memoized_rejects_n_above_cap():
    with pytest.raises(DomainError, match = "exceeds maximum"):
        FibonacciAlgorithm().run(build_input(45, "memoized"))


def test_fib_unknown_mode_rejected():
    with pytest.raises(DomainError, match = "Unknown Fibonacci mode"):
        FibonacciAlgorithm().run(build_input(5, "bogus"))


def test_fib_default_mode_is_tabulation():
    output = FibonacciAlgorithm().run(AlgorithmInput(
        input_payload = {"n": 5},
        execution_mode = "simulate",
        explanation_level = "standard",
    ))
    assert output.final_result["mode"] == "tabulation"


def test_fib_fails_on_invalid_input():
    with pytest.raises(DomainError, match = "Invalid fibonacci input"):
        FibonacciAlgorithm().run(build_input(0))
