import math

import pytest

from app.algorithms.graph.bfs_grid import BFSGridAlgorithm
from app.algorithms.graph.dfs_grid import DFSGridAlgorithm
from app.algorithms.graph.dijkstra_grid import DijkstraGridAlgorithm
from app.algorithms.graph.astar_grid import AStarGridAlgorithm
from app.simulation.types import AlgorithmInput


# ── Test Helpers ────────────────────────────────────────────

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


# ── Test Payloads ───────────────────────────────────────────

# 5x5, no walls, source (0,0), target (4,4)
SIMPLE_GRID = _payload()

# 5x5, wall barrier at column 2 with gap at row 2
# Source (0,0), target (0,4) — must navigate around wall
WALLED_GRID = _payload(
    walls = [(0, 2), (1, 2), (3, 2), (4, 2)],
    source = (0, 0),
    target = (0, 4),
)

# 5x5, target (4,4) enclosed by walls — no path exists
NO_PATH_GRID = _payload(
    walls = [(3, 3), (3, 4), (4, 3)],
)

# 5x5, diagonal movement enabled, no walls
DIAGONAL_GRID = _payload(allow_diagonal = True)

# L-shaped corridor — only one possible path
# . X X X X
# . X X X X
# . . . . .
# X X X X .
# X X X X .
SINGLE_PATH_GRID = _payload(
    walls = [
        (0, 1), (0, 2), (0, 3), (0, 4),
        (1, 1), (1, 2), (1, 3), (1, 4),
        (3, 0), (3, 1), (3, 2), (3, 3),
        (4, 0), (4, 1), (4, 2), (4, 3),
    ],
)

SINGLE_PATH_EXPECTED = [
    [0, 0], [1, 0], [2, 0], [2, 1], [2, 2], [2, 3], [2, 4], [3, 4], [4, 4],
]


# ── BFS Grid Tests ──────────────────────────────────────────

class TestBFSGrid:
    def test_finds_shortest_path_on_simple_grid(self):
        output = BFSGridAlgorithm().run(build_input(SIMPLE_GRID))
        assert output.final_result["path_found"] is True
        path = output.final_result["path"]
        assert path[0] == [0, 0]
        assert path[-1] == [4, 4]
        # Manhattan distance 8, so shortest path = 9 cells
        assert len(path) == 9

    def test_navigates_around_walls(self):
        output = BFSGridAlgorithm().run(build_input(WALLED_GRID))
        assert output.final_result["path_found"] is True
        path = output.final_result["path"]
        assert path[0] == [0, 0]
        assert path[-1] == [0, 4]
        # Without walls: 5 cells. With walls: must detour through row 2 gap
        assert len(path) > 5

    def test_returns_complete_when_no_path(self):
        output = BFSGridAlgorithm().run(build_input(NO_PATH_GRID))
        assert output.final_result["path_found"] is False
        assert output.final_result["path"] == []
        assert output.timeline_steps[-1].event_type == "COMPLETE"
        assert output.summary_metrics["path_length"] == 0

    def test_diagonal_finds_shorter_path(self):
        output = BFSGridAlgorithm().run(build_input(DIAGONAL_GRID))
        assert output.final_result["path_found"] is True
        # Chebyshev distance = 4 hops = 5 cells with diagonals
        assert len(output.final_result["path"]) == 5

    def test_finds_only_path_in_corridor(self):
        output = BFSGridAlgorithm().run(build_input(SINGLE_PATH_GRID))
        assert output.final_result["path_found"] is True
        assert output.final_result["path"] == SINGLE_PATH_EXPECTED

    def test_benchmark_mode(self):
        output = BFSGridAlgorithm().run(build_input(SIMPLE_GRID, execution_mode = "benchmark"))
        assert output.timeline_steps == []
        assert output.final_result["path_found"] is True
        assert output.summary_metrics["cells_explored"] > 0
        assert output.summary_metrics["frontier_max_size"] > 0
        assert output.summary_metrics["path_length"] == 9

    def test_timeline_structure(self):
        output = BFSGridAlgorithm().run(build_input(SIMPLE_GRID))
        assert output.timeline_steps[0].event_type == "INITIALIZE"
        assert output.timeline_steps[-1].event_type == "PATH_FOUND"
        event_types = {s.event_type for s in output.timeline_steps}
        assert "DEQUEUE" in event_types
        assert "ENQUEUE" in event_types

    def test_exploration_order_accumulates(self):
        output = BFSGridAlgorithm().run(build_input(SIMPLE_GRID))
        dequeue_steps = [s for s in output.timeline_steps if s.event_type == "DEQUEUE"]
        last_dequeue = dequeue_steps[-1]
        assert len(last_dequeue.state_payload["exploration_order"]) > 1

    def test_cell_states_correctness(self):
        output = BFSGridAlgorithm().run(build_input(SIMPLE_GRID))
        init_payload = output.timeline_steps[0].state_payload
        assert init_payload["cell_states"]["0,0"] == "source"
        assert init_payload["cell_states"]["4,4"] == "target"

        path_payload = output.timeline_steps[-1].state_payload
        assert path_payload["cell_states"]["0,0"] == "success"
        assert path_payload["cell_states"]["4,4"] == "success"

    def test_metadata(self):
        output = BFSGridAlgorithm().run(build_input(SIMPLE_GRID))
        m = output.algorithm_metadata
        assert m["module_type"] == "graph"
        assert m["algorithm_key"] == "bfs_grid"
        assert m["time_complexity"] == "O(R*C)"
        assert m["space_complexity"] == "O(R*C)"
        assert m["allow_diagonal"] is False


# ── DFS Grid Tests ──────────────────────────────────────────

class TestDFSGrid:
    def test_finds_path_on_simple_grid(self):
        output = DFSGridAlgorithm().run(build_input(SIMPLE_GRID))
        assert output.final_result["path_found"] is True
        path = output.final_result["path"]
        assert path[0] == [0, 0]
        assert path[-1] == [4, 4]
        # DFS path >= BFS shortest path
        assert len(path) >= 9

    def test_backtrack_events_on_walled_grid(self):
        output = DFSGridAlgorithm().run(build_input(WALLED_GRID))
        assert output.final_result["path_found"] is True
        event_types = [s.event_type for s in output.timeline_steps]
        assert "BACKTRACK" in event_types

    def test_returns_complete_when_no_path(self):
        output = DFSGridAlgorithm().run(build_input(NO_PATH_GRID))
        assert output.final_result["path_found"] is False
        assert output.final_result["path"] == []
        assert output.timeline_steps[-1].event_type == "COMPLETE"
        assert output.summary_metrics["path_length"] == 0

    def test_finds_only_path_in_corridor(self):
        output = DFSGridAlgorithm().run(build_input(SINGLE_PATH_GRID))
        assert output.final_result["path_found"] is True
        assert output.final_result["path"] == SINGLE_PATH_EXPECTED

    def test_path_length_gte_bfs(self):
        bfs_output = BFSGridAlgorithm().run(build_input(SIMPLE_GRID))
        dfs_output = DFSGridAlgorithm().run(build_input(SIMPLE_GRID))
        assert len(dfs_output.final_result["path"]) >= len(bfs_output.final_result["path"])

    def test_benchmark_mode(self):
        output = DFSGridAlgorithm().run(build_input(SIMPLE_GRID, execution_mode = "benchmark"))
        assert output.timeline_steps == []
        assert output.final_result["path_found"] is True
        assert output.summary_metrics["cells_explored"] > 0
        assert output.summary_metrics["path_length"] > 0

    def test_timeline_structure(self):
        output = DFSGridAlgorithm().run(build_input(SIMPLE_GRID))
        assert output.timeline_steps[0].event_type == "INITIALIZE"
        event_types = {s.event_type for s in output.timeline_steps}
        assert "POP" in event_types
        assert "PUSH" in event_types

    def test_total_steps_gte_cells_explored(self):
        output = DFSGridAlgorithm().run(build_input(SIMPLE_GRID))
        assert output.summary_metrics["total_steps"] >= output.summary_metrics["cells_explored"]

    def test_metadata(self):
        output = DFSGridAlgorithm().run(build_input(SIMPLE_GRID))
        m = output.algorithm_metadata
        assert m["module_type"] == "graph"
        assert m["algorithm_key"] == "dfs_grid"
        assert m["time_complexity"] == "O(R*C)"
        assert m["space_complexity"] == "O(R*C)"


# ── Dijkstra Grid Tests ────────────────────────────────────

class TestDijkstraGrid:
    def test_finds_shortest_distance_path(self):
        output = DijkstraGridAlgorithm().run(build_input(SIMPLE_GRID))
        assert output.final_result["path_found"] is True
        path = output.final_result["path"]
        assert path[0] == [0, 0]
        assert path[-1] == [4, 4]
        # All cardinal: 8 hops * 1.0 = 8.0
        assert output.final_result["path_cost"] == 8.0

    def test_cardinal_path_matches_bfs_length(self):
        dij = DijkstraGridAlgorithm().run(build_input(SIMPLE_GRID))
        bfs = BFSGridAlgorithm().run(build_input(SIMPLE_GRID))
        assert len(dij.final_result["path"]) == len(bfs.final_result["path"])

    def test_diagonal_uses_sqrt2_costs(self):
        output = DijkstraGridAlgorithm().run(build_input(DIAGONAL_GRID))
        assert output.final_result["path_found"] is True
        # 4 diagonal steps * sqrt(2) each
        assert abs(output.final_result["path_cost"] - 4 * math.sqrt(2)) < 0.01

    def test_distances_in_state_payload(self):
        output = DijkstraGridAlgorithm().run(build_input(SIMPLE_GRID))
        pop_step = next(s for s in output.timeline_steps if s.event_type == "POP_MIN")
        assert pop_step.state_payload["distances"] is not None
        assert pop_step.state_payload["distances"]["0,0"] == 0

    def test_returns_complete_when_no_path(self):
        output = DijkstraGridAlgorithm().run(build_input(NO_PATH_GRID))
        assert output.final_result["path_found"] is False
        assert output.final_result["path_cost"] is None
        assert output.timeline_steps[-1].event_type == "COMPLETE"

    def test_finds_only_path_in_corridor(self):
        output = DijkstraGridAlgorithm().run(build_input(SINGLE_PATH_GRID))
        assert output.final_result["path_found"] is True
        assert output.final_result["path"] == SINGLE_PATH_EXPECTED

    def test_benchmark_mode(self):
        output = DijkstraGridAlgorithm().run(build_input(SIMPLE_GRID, execution_mode = "benchmark"))
        assert output.timeline_steps == []
        assert output.final_result["path_found"] is True
        assert output.summary_metrics["cells_explored"] > 0
        assert output.summary_metrics["path_length"] == 9

    def test_timeline_structure(self):
        output = DijkstraGridAlgorithm().run(build_input(SIMPLE_GRID))
        assert output.timeline_steps[0].event_type == "INITIALIZE"
        event_types = {s.event_type for s in output.timeline_steps}
        assert "POP_MIN" in event_types
        assert "RELAX" in event_types

    def test_metadata(self):
        output = DijkstraGridAlgorithm().run(build_input(SIMPLE_GRID))
        m = output.algorithm_metadata
        assert m["algorithm_key"] == "dijkstra_grid"
        assert m["time_complexity"] == "O(R*C * log(R*C))"
        assert m["space_complexity"] == "O(R*C)"


# ── A* Grid Tests ───────────────────────────────────────────

class TestAStarGrid:
    def test_finds_optimal_path(self):
        output = AStarGridAlgorithm().run(build_input(SIMPLE_GRID))
        assert output.final_result["path_found"] is True
        path = output.final_result["path"]
        assert path[0] == [0, 0]
        assert path[-1] == [4, 4]
        assert output.final_result["path_cost"] == 8.0

    def test_same_cost_as_dijkstra_cardinal(self):
        astar = AStarGridAlgorithm().run(build_input(SIMPLE_GRID))
        dij = DijkstraGridAlgorithm().run(build_input(SIMPLE_GRID))
        assert astar.final_result["path_cost"] == dij.final_result["path_cost"]

    def test_same_cost_as_dijkstra_diagonal(self):
        astar = AStarGridAlgorithm().run(build_input(DIAGONAL_GRID))
        dij = DijkstraGridAlgorithm().run(build_input(DIAGONAL_GRID))
        assert abs(astar.final_result["path_cost"] - dij.final_result["path_cost"]) < 0.01

    def test_manhattan_heuristic_for_cardinal(self):
        output = AStarGridAlgorithm().run(build_input(SIMPLE_GRID))
        assert output.algorithm_metadata["heuristic"] == "Manhattan"
        init_step = output.timeline_steps[0]
        h_values = init_step.state_payload["heuristic_values"]
        # h(0,0) to (4,4) = |0-4| + |0-4| = 8
        assert h_values["0,0"]["h"] == 8.0

    def test_octile_heuristic_for_diagonal(self):
        output = AStarGridAlgorithm().run(build_input(DIAGONAL_GRID))
        assert output.algorithm_metadata["heuristic"] == "Octile"
        init_step = output.timeline_steps[0]
        h_values = init_step.state_payload["heuristic_values"]
        # h(0,0) = max(4,4) + (sqrt2-1)*min(4,4) = 4*sqrt(2)
        assert abs(h_values["0,0"]["h"] - 4 * math.sqrt(2)) < 0.01

    def test_heuristic_values_in_state_payload(self):
        output = AStarGridAlgorithm().run(build_input(SIMPLE_GRID))
        pop_step = next(s for s in output.timeline_steps if s.event_type == "POP_MIN")
        h_vals = pop_step.state_payload["heuristic_values"]
        assert h_vals is not None
        assert "g" in h_vals["0,0"]
        assert "h" in h_vals["0,0"]
        assert "f" in h_vals["0,0"]

    def test_explores_lte_dijkstra(self):
        astar = AStarGridAlgorithm().run(build_input(WALLED_GRID))
        dij = DijkstraGridAlgorithm().run(build_input(WALLED_GRID))
        assert astar.summary_metrics["cells_explored"] <= dij.summary_metrics["cells_explored"]

    def test_returns_complete_when_no_path(self):
        output = AStarGridAlgorithm().run(build_input(NO_PATH_GRID))
        assert output.final_result["path_found"] is False
        assert output.final_result["path_cost"] is None
        assert output.timeline_steps[-1].event_type == "COMPLETE"

    def test_finds_only_path_in_corridor(self):
        output = AStarGridAlgorithm().run(build_input(SINGLE_PATH_GRID))
        assert output.final_result["path_found"] is True
        assert output.final_result["path"] == SINGLE_PATH_EXPECTED

    def test_benchmark_mode(self):
        output = AStarGridAlgorithm().run(build_input(DIAGONAL_GRID, execution_mode = "benchmark"))
        assert output.timeline_steps == []
        assert output.final_result["path_found"] is True
        assert output.summary_metrics["cells_explored"] > 0
        assert output.summary_metrics["path_length"] > 0

    def test_metadata(self):
        output = AStarGridAlgorithm().run(build_input(SIMPLE_GRID))
        m = output.algorithm_metadata
        assert m["algorithm_key"] == "astar_grid"
        assert m["time_complexity"] == "O(R*C * log(R*C))"
        assert m["space_complexity"] == "O(R*C)"
        assert m["heuristic"] == "Manhattan"


# ── Cross-Algorithm Tests ───────────────────────────────────

class TestCrossAlgorithm:
    ALL = [BFSGridAlgorithm, DFSGridAlgorithm, DijkstraGridAlgorithm, AStarGridAlgorithm]

    def test_all_agree_on_path_existence_simple(self):
        for cls in self.ALL:
            output = cls().run(build_input(SIMPLE_GRID))
            assert output.final_result["path_found"] is True, f"{cls.__name__} failed"

    def test_all_agree_on_no_path(self):
        for cls in self.ALL:
            output = cls().run(build_input(NO_PATH_GRID))
            assert output.final_result["path_found"] is False, f"{cls.__name__} failed"

    def test_all_find_same_corridor_path(self):
        for cls in self.ALL:
            output = cls().run(build_input(SINGLE_PATH_GRID))
            assert output.final_result["path"] == SINGLE_PATH_EXPECTED, f"{cls.__name__} failed"

    def test_all_produce_valid_output_structure(self):
        for cls in self.ALL:
            output = cls().run(build_input(SIMPLE_GRID))
            assert "path_found" in output.final_result
            assert "path" in output.final_result
            assert "cells_explored" in output.final_result
            assert "cells_explored" in output.summary_metrics
            assert "frontier_max_size" in output.summary_metrics
            assert "path_length" in output.summary_metrics
            assert "total_steps" in output.summary_metrics
            assert output.timeline_steps[0].event_type == "INITIALIZE", f"{cls.__name__} failed"

    def test_dfs_path_gte_bfs_path(self):
        bfs = BFSGridAlgorithm().run(build_input(SIMPLE_GRID))
        dfs = DFSGridAlgorithm().run(build_input(SIMPLE_GRID))
        assert len(dfs.final_result["path"]) >= len(bfs.final_result["path"])

    def test_dijkstra_and_astar_same_cost_diagonal(self):
        dij = DijkstraGridAlgorithm().run(build_input(DIAGONAL_GRID))
        astar = AStarGridAlgorithm().run(build_input(DIAGONAL_GRID))
        assert abs(dij.final_result["path_cost"] - astar.final_result["path_cost"]) < 0.01
