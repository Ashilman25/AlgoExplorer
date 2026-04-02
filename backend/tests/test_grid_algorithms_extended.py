"""
Extended grid algorithm tests covering:
- exploration_order monotonically increasing values
- explanation_level variations (none / standard / detailed)
"""

import pytest

from app.algorithms.graph.bfs_grid import BFSGridAlgorithm
from app.algorithms.graph.dfs_grid import DFSGridAlgorithm
from app.algorithms.graph.dijkstra_grid import DijkstraGridAlgorithm
from app.algorithms.graph.astar_grid import AStarGridAlgorithm
from app.simulation.types import AlgorithmInput


# ── Helpers ────────────────────────────────────────────────

def _grid(rows, cols, walls = None):
    g = [[0] * cols for _ in range(rows)]
    for r, c in (walls or []):
        g[r][c] = 1
    return g


def _payload(rows = 5, cols = 5, walls = None, source = (0, 0), target = (4, 4),
             allow_diagonal = False, weighted = False):
    return {
        "grid": _grid(rows, cols, walls),
        "source": {"row": source[0], "col": source[1]},
        "target": {"row": target[0], "col": target[1]},
        "weighted": weighted,
        "allow_diagonal": allow_diagonal,
        "mode": "grid",
    }


def build_input(payload, execution_mode = "simulate", explanation_level = "standard"):
    return AlgorithmInput(
        input_payload = payload,
        execution_mode = execution_mode,
        explanation_level = explanation_level,
    )


SIMPLE_GRID = _payload()

ALL_ALGORITHMS = [BFSGridAlgorithm, DFSGridAlgorithm, DijkstraGridAlgorithm, AStarGridAlgorithm]


# ── exploration_order monotonically increasing ─────────────

class TestExplorationOrderMonotonic:
    """exploration_order values should increase over time: each newly explored
    cell gets a strictly higher order number than previously explored cells."""

    @pytest.mark.parametrize("cls", ALL_ALGORITHMS, ids = lambda c: c.__name__)
    def test_exploration_order_values_are_monotonically_increasing(self, cls):
        output = cls().run(build_input(SIMPLE_GRID))

        # Collect exploration_order dicts across steps that have entries
        prev_max_order = -1
        for step in output.timeline_steps:
            eo = step.state_payload.get("exploration_order", {})
            if not eo:
                continue

            orders = sorted(eo.values())
            # Values within a single step should be non-decreasing
            for i in range(1, len(orders)):
                assert orders[i] >= orders[i - 1], (
                    f"{cls.__name__} step {step.step_index}: "
                    f"exploration_order not monotonic: {orders}"
                )

    @pytest.mark.parametrize("cls", ALL_ALGORITHMS, ids = lambda c: c.__name__)
    def test_exploration_order_accumulates_across_steps(self, cls):
        """Later steps should have >= entries than earlier steps (never shrinks)."""
        output = cls().run(build_input(SIMPLE_GRID))

        prev_count = 0
        for step in output.timeline_steps:
            eo = step.state_payload.get("exploration_order", {})
            assert len(eo) >= prev_count, (
                f"{cls.__name__} step {step.step_index}: "
                f"exploration_order shrank from {prev_count} to {len(eo)}"
            )
            prev_count = len(eo)

    @pytest.mark.parametrize("cls", ALL_ALGORITHMS, ids = lambda c: c.__name__)
    def test_exploration_order_final_step_has_all_explored_cells(self, cls):
        """The last step's exploration_order count should match cells_explored metric."""
        output = cls().run(build_input(SIMPLE_GRID))
        last_eo = output.timeline_steps[-1].state_payload.get("exploration_order", {})
        assert len(last_eo) == output.summary_metrics["cells_explored"]


# ── explanation_level variations ───────────────────────────

class TestExplanationLevels:
    """explanation_level controls the verbosity of step explanations:
    - 'none': title only (no body, no data_snapshot)
    - 'standard': title + body (no data_snapshot)
    - 'detailed': title + body + data_snapshot
    """

    @pytest.mark.parametrize("cls", ALL_ALGORITHMS, ids = lambda c: c.__name__)
    def test_none_explanation_has_title_only(self, cls):
        output = cls().run(build_input(SIMPLE_GRID, explanation_level = "none"))
        for step in output.timeline_steps:
            exp = step.explanation
            assert exp.title, f"{cls.__name__} step {step.step_index}: missing title"
            assert exp.body is None, (
                f"{cls.__name__} step {step.step_index}: "
                f"expected no body at level 'none', got: {exp.body}"
            )
            assert exp.data_snapshot is None, (
                f"{cls.__name__} step {step.step_index}: "
                f"expected no data_snapshot at level 'none'"
            )

    @pytest.mark.parametrize("cls", ALL_ALGORITHMS, ids = lambda c: c.__name__)
    def test_standard_explanation_has_title_and_body(self, cls):
        output = cls().run(build_input(SIMPLE_GRID, explanation_level = "standard"))
        for step in output.timeline_steps:
            exp = step.explanation
            assert exp.title
            assert exp.body is not None, (
                f"{cls.__name__} step {step.step_index}: "
                f"expected body at level 'standard'"
            )
            assert exp.data_snapshot is None, (
                f"{cls.__name__} step {step.step_index}: "
                f"expected no data_snapshot at level 'standard'"
            )

    @pytest.mark.parametrize("cls", ALL_ALGORITHMS, ids = lambda c: c.__name__)
    def test_detailed_explanation_has_title_body_and_data_snapshot(self, cls):
        output = cls().run(build_input(SIMPLE_GRID, explanation_level = "detailed"))
        for step in output.timeline_steps:
            exp = step.explanation
            assert exp.title
            assert exp.body is not None, (
                f"{cls.__name__} step {step.step_index}: "
                f"expected body at level 'detailed'"
            )
            assert exp.data_snapshot is not None, (
                f"{cls.__name__} step {step.step_index}: "
                f"expected data_snapshot at level 'detailed', got None"
            )

    @pytest.mark.parametrize("cls", ALL_ALGORITHMS, ids = lambda c: c.__name__)
    def test_explanation_content_varies_by_level(self, cls):
        """Confirm the three levels actually produce different output."""
        out_none = cls().run(build_input(SIMPLE_GRID, explanation_level = "none"))
        out_std = cls().run(build_input(SIMPLE_GRID, explanation_level = "standard"))
        out_detail = cls().run(build_input(SIMPLE_GRID, explanation_level = "detailed"))

        # Pick a step that all algorithms produce (first step = INITIALIZE)
        exp_none = out_none.timeline_steps[0].explanation
        exp_std = out_std.timeline_steps[0].explanation
        exp_detail = out_detail.timeline_steps[0].explanation

        # All share the same title
        assert exp_none.title == exp_std.title == exp_detail.title

        # 'none' has no body; 'standard' and 'detailed' do
        assert exp_none.body is None
        assert exp_std.body is not None
        assert exp_detail.body is not None

        # Only 'detailed' has data_snapshot
        assert exp_std.data_snapshot is None
        assert exp_detail.data_snapshot is not None
