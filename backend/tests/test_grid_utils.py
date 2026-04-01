import math

from app.algorithms.graph.grid_utils import (
    coord_key, GridConfig, parse_grid_input, build_grid_adjacency, make_grid_step,
)
from app.schemas.timeline import TimelineStep, HighlightedEntity, StepExplanation
from app.exceptions import DomainError
import pytest


def _grid(rows, cols, walls=None):
    """Build a rows x cols grid with optional wall cells."""
    g = [[0] * cols for _ in range(rows)]
    for r, c in (walls or []):
        g[r][c] = 1
    return g


def _payload(rows=5, cols=5, walls=None, source=(0, 0), target=(4, 4),
             allow_diagonal=False, weighted=False):
    """Build a valid grid input payload dict."""
    return {
        "grid": _grid(rows, cols, walls),
        "source": {"row": source[0], "col": source[1]},
        "target": {"row": target[0], "col": target[1]},
        "weighted": weighted,
        "allow_diagonal": allow_diagonal,
        "mode": "grid",
    }


def _config(rows=5, cols=5, walls=None, start=(0, 0), end=(4, 4),
            allow_diagonal=False, weighted=False):
    """Build a GridConfig directly for unit tests."""
    grid = _grid(rows, cols, walls)
    wall_set = frozenset(walls or [])
    return GridConfig(
        rows = rows, cols = cols, grid = grid, walls = wall_set,
        start = start, end = end,
        allow_diagonal = allow_diagonal, weighted = weighted,
    )


class TestCoordKey:
    def test_zero_zero(self):
        assert coord_key(0, 0) == "0,0"

    def test_arbitrary_coords(self):
        assert coord_key(3, 7) == "3,7"

    def test_max_grid_bounds(self):
        assert coord_key(49, 49) == "49,49"


class TestParseGridInput:
    def test_valid_payload_returns_grid_config(self):
        config = parse_grid_input(_payload())
        assert isinstance(config, GridConfig)
        assert config.rows == 5
        assert config.cols == 5
        assert config.start == (0, 0)
        assert config.end == (4, 4)
        assert config.allow_diagonal is False
        assert config.weighted is False

    def test_extracts_walls_correctly(self):
        config = parse_grid_input(_payload(walls = [(1, 2), (3, 0)]))
        assert config.walls == frozenset({(1, 2), (3, 0)})

    def test_no_walls_produces_empty_frozenset(self):
        config = parse_grid_input(_payload())
        assert config.walls == frozenset()

    def test_maps_source_target_to_start_end(self):
        config = parse_grid_input(_payload(source = (2, 3), target = (4, 1)))
        assert config.start == (2, 3)
        assert config.end == (4, 1)

    def test_preserves_diagonal_flag(self):
        config = parse_grid_input(_payload(allow_diagonal = True))
        assert config.allow_diagonal is True

    def test_preserves_weighted_flag(self):
        config = parse_grid_input(_payload(weighted = True))
        assert config.weighted is True

    def test_grid_data_preserved(self):
        config = parse_grid_input(_payload(walls = [(1, 1), (2, 3)]))
        assert config.grid[1][1] == 1
        assert config.grid[2][3] == 1
        assert config.grid[0][0] == 0

    def test_invalid_payload_raises_domain_error(self):
        with pytest.raises(DomainError, match = "Invalid grid input"):
            parse_grid_input({"not": "valid"})


class TestBuildGridAdjacencyCardinal:
    def test_interior_cell_has_four_neighbors(self):
        adj = build_grid_adjacency(_config())
        neighbor_cells = {cell for cell, cost in adj[(2, 2)]}
        assert neighbor_cells == {(1, 2), (3, 2), (2, 1), (2, 3)}

    def test_corner_cell_has_two_neighbors(self):
        adj = build_grid_adjacency(_config())
        neighbor_cells = {cell for cell, cost in adj[(0, 0)]}
        assert neighbor_cells == {(1, 0), (0, 1)}

    def test_edge_cell_has_three_neighbors(self):
        adj = build_grid_adjacency(_config())
        neighbor_cells = {cell for cell, cost in adj[(0, 2)]}
        assert neighbor_cells == {(0, 1), (0, 3), (1, 2)}

    def test_wall_cell_excluded_from_keys(self):
        adj = build_grid_adjacency(_config(walls = [(2, 2)]))
        assert (2, 2) not in adj

    def test_wall_blocks_neighbor(self):
        adj = build_grid_adjacency(_config(walls = [(2, 1)]))
        neighbor_cells = {cell for cell, cost in adj[(2, 2)]}
        assert (2, 1) not in neighbor_cells
        assert neighbor_cells == {(1, 2), (3, 2), (2, 3)}

    def test_all_cardinal_costs_are_one(self):
        adj = build_grid_adjacency(_config())
        for neighbors in adj.values():
            for _, cost in neighbors:
                assert cost == 1.0

    def test_all_passable_cells_present_as_keys(self):
        adj = build_grid_adjacency(_config(walls = [(1, 1), (3, 3)]))
        expected_keys = {
            (r, c) for r in range(5) for c in range(5)
            if (r, c) not in {(1, 1), (3, 3)}
        }
        assert set(adj.keys()) == expected_keys


class TestBuildGridAdjacencyDiagonal:
    def test_interior_cell_has_eight_neighbors(self):
        adj = build_grid_adjacency(_config(allow_diagonal = True))
        assert len(adj[(2, 2)]) == 8

    def test_diagonal_neighbors_correct(self):
        adj = build_grid_adjacency(_config(allow_diagonal = True))
        neighbor_cells = {cell for cell, cost in adj[(2, 2)]}
        expected = {
            (1, 2), (3, 2), (2, 1), (2, 3),
            (1, 1), (1, 3), (3, 1), (3, 3),
        }
        assert neighbor_cells == expected

    def test_corner_cutting_blocked_by_wall_on_row(self):
        """Wall at (1,0): diagonal (0,0)->(1,1) blocked because (1,0) is a wall."""
        adj = build_grid_adjacency(_config(walls = [(1, 0)], allow_diagonal = True))
        neighbor_cells = {cell for cell, cost in adj[(0, 0)]}
        assert (1, 1) not in neighbor_cells
        assert (0, 1) in neighbor_cells

    def test_corner_cutting_blocked_by_wall_on_col(self):
        """Wall at (0,1): diagonal (0,0)->(1,1) blocked because (0,1) is a wall."""
        adj = build_grid_adjacency(_config(walls = [(0, 1)], allow_diagonal = True))
        neighbor_cells = {cell for cell, cost in adj[(0, 0)]}
        assert (1, 1) not in neighbor_cells
        assert (1, 0) in neighbor_cells

    def test_diagonal_allowed_when_both_cardinals_passable(self):
        adj = build_grid_adjacency(_config(allow_diagonal = True))
        neighbor_cells = {cell for cell, cost in adj[(0, 0)]}
        assert (1, 1) in neighbor_cells

    def test_diagonal_cost_is_sqrt2(self):
        adj = build_grid_adjacency(_config(allow_diagonal = True))
        diagonal_cells = {(1, 1), (1, 3), (3, 1), (3, 3)}
        diagonal_costs = {cost for cell, cost in adj[(2, 2)] if cell in diagonal_cells}
        assert diagonal_costs == {math.sqrt(2)}

    def test_cardinal_cost_unchanged_with_diagonal(self):
        adj = build_grid_adjacency(_config(allow_diagonal = True))
        cardinal_cells = {(1, 2), (3, 2), (2, 1), (2, 3)}
        cardinal_costs = {cost for cell, cost in adj[(2, 2)] if cell in cardinal_cells}
        assert cardinal_costs == {1.0}

    def test_corner_cell_diagonal_respects_bounds(self):
        adj = build_grid_adjacency(_config(allow_diagonal = True))
        neighbor_cells = {cell for cell, cost in adj[(0, 0)]}
        assert neighbor_cells == {(0, 1), (1, 0), (1, 1)}


class TestMakeGridStep:
    def _base_step(self, config=None, **overrides):
        """Build a make_grid_step call with sensible defaults."""
        if config is None:
            config = _config(walls = [(1, 1)])
        defaults = {
            "config": config,
            "step_index": 0,
            "event_type": "INITIALIZE",
            "cell_states": {"0,0": "source", "4,4": "target"},
            "exploration_order": {"0,0": 0},
            "frontier_cells": [[0, 1], [1, 0]],
            "highlighted_entities": [
                HighlightedEntity(id = "0,0", state = "source", label = "(0,0)"),
            ],
            "metrics_snapshot": {"cells_visited": 1, "edges_explored": 0},
            "explanation": StepExplanation(title = "Init", body = "Starting BFS"),
        }
        defaults.update(overrides)
        return make_grid_step(**defaults)

    def test_returns_timeline_step(self):
        step = self._base_step()
        assert isinstance(step, TimelineStep)

    def test_step_index_and_event_type(self):
        step = self._base_step(step_index = 5, event_type = "DEQUEUE")
        assert step.step_index == 5
        assert step.event_type == "DEQUEUE"

    def test_timestamp_equals_step_index(self):
        step = self._base_step(step_index = 3)
        assert step.timestamp_or_order == 3

    def test_state_payload_has_all_required_keys(self):
        payload = self._base_step().state_payload
        expected_keys = {
            "cell_states", "exploration_order", "frontier_cells",
            "path", "distances", "heuristic_values", "grid_meta",
            "pseudocode_lines",
        }
        assert set(payload.keys()) == expected_keys

    def test_grid_meta_derived_from_config(self):
        config = _config(rows = 10, cols = 8, walls = [(1, 2), (3, 0)], allow_diagonal = True)
        meta = self._base_step(config = config).state_payload["grid_meta"]
        assert meta["rows"] == 10
        assert meta["cols"] == 8
        assert meta["walls"] == [[1, 2], [3, 0]]
        assert meta["allow_diagonal"] is True

    def test_grid_meta_walls_sorted_row_major(self):
        config = _config(walls = [(3, 0), (1, 2), (1, 0)])
        walls = self._base_step(config = config).state_payload["grid_meta"]["walls"]
        assert walls == [[1, 0], [1, 2], [3, 0]]

    def test_defensive_copy_cell_states(self):
        cell_states = {"0,0": "source", "4,4": "target"}
        step = self._base_step(cell_states = cell_states)
        cell_states["0,0"] = "visited"
        assert step.state_payload["cell_states"]["0,0"] == "source"

    def test_defensive_copy_exploration_order(self):
        exploration_order = {"0,0": 0}
        step = self._base_step(exploration_order = exploration_order)
        exploration_order["0,0"] = 99
        assert step.state_payload["exploration_order"]["0,0"] == 0

    def test_defensive_copy_frontier_cells(self):
        frontier_cells = [[0, 1]]
        step = self._base_step(frontier_cells = frontier_cells)
        frontier_cells.append([1, 1])
        assert step.state_payload["frontier_cells"] == [[0, 1]]

    def test_defensive_copy_metrics_snapshot(self):
        metrics = {"cells_visited": 1}
        step = self._base_step(metrics_snapshot = metrics)
        metrics["cells_visited"] = 999
        assert step.metrics_snapshot["cells_visited"] == 1

    def test_path_default_none(self):
        assert self._base_step().state_payload["path"] is None

    def test_distances_default_none(self):
        assert self._base_step().state_payload["distances"] is None

    def test_heuristic_values_default_none(self):
        assert self._base_step().state_payload["heuristic_values"] is None

    def test_pseudocode_lines_default_empty(self):
        assert self._base_step().state_payload["pseudocode_lines"] == []

    def test_path_included_when_provided(self):
        step = self._base_step(path = [[0, 0], [1, 0], [2, 0]])
        assert step.state_payload["path"] == [[0, 0], [1, 0], [2, 0]]

    def test_distances_included_when_provided(self):
        step = self._base_step(distances = {"0,0": 0, "0,1": 1})
        assert step.state_payload["distances"] == {"0,0": 0, "0,1": 1}

    def test_heuristic_values_included_when_provided(self):
        heuristics = {"0,0": {"g": 0, "h": 5, "f": 5}}
        step = self._base_step(heuristic_values = heuristics)
        assert step.state_payload["heuristic_values"] == heuristics

    def test_defensive_copy_heuristic_values_inner_dicts(self):
        heuristics = {"0,0": {"g": 0, "h": 5, "f": 5}}
        step = self._base_step(heuristic_values = heuristics)
        heuristics["0,0"]["g"] = 99
        assert step.state_payload["heuristic_values"]["0,0"]["g"] == 0

    def test_pseudocode_lines_included_when_provided(self):
        step = self._base_step(pseudocode_lines = [5, 6, 7])
        assert step.state_payload["pseudocode_lines"] == [5, 6, 7]

    def test_highlighted_entities_passed_through(self):
        entities = [
            HighlightedEntity(id = "2,2", state = "active", label = "(2,2)"),
            HighlightedEntity(id = "2,3", state = "frontier", label = "(2,3)"),
        ]
        step = self._base_step(highlighted_entities = entities)
        assert len(step.highlighted_entities) == 2
        assert step.highlighted_entities[0].id == "2,2"
        assert step.highlighted_entities[1].state == "frontier"

    def test_explanation_passed_through(self):
        explanation = StepExplanation(title = "Dequeue (2,2)", body = "Exploring neighbors")
        step = self._base_step(explanation = explanation)
        assert step.explanation.title == "Dequeue (2,2)"
        assert step.explanation.body == "Exploring neighbors"
