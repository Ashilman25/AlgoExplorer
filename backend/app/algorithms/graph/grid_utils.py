import math
from typing import Any, NamedTuple

from pydantic import ValidationError

from app.schemas.payloads import GridInputPayload
from app.schemas.timeline import TimelineStep, HighlightedEntity, StepExplanation
from app.exceptions import DomainError


CARDINAL_DIRS = [(-1, 0), (1, 0), (0, -1), (0, 1)]
DIAGONAL_DIRS = [(-1, -1), (-1, 1), (1, -1), (1, 1)]

CARDINAL_COST = 1.0
DIAGONAL_COST = math.sqrt(2)


class GridConfig(NamedTuple):
    rows: int
    cols: int
    grid: list[list[int]]
    walls: frozenset[tuple[int, int]]
    start: tuple[int, int]
    end: tuple[int, int]
    allow_diagonal: bool
    weighted: bool


def parse_grid_input(payload: dict) -> GridConfig:
    try:
        parsed = GridInputPayload.model_validate(payload)
    except ValidationError as e:
        raise DomainError("Invalid grid input.", details = {"errors": e.errors()})

    grid = parsed.grid
    rows = len(grid)
    cols = len(grid[0])

    walls: set[tuple[int, int]] = set()
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == 1:
                walls.add((r, c))

    return GridConfig(
        rows = rows,
        cols = cols,
        grid = grid,
        walls = frozenset(walls),
        start = (parsed.source.row, parsed.source.col),
        end = (parsed.target.row, parsed.target.col),
        allow_diagonal = parsed.allow_diagonal,
        weighted = parsed.weighted,
    )


def build_grid_adjacency(config: GridConfig) -> dict[tuple[int, int], list[tuple[tuple[int, int], float]]]:
    adj: dict[tuple[int, int], list[tuple[tuple[int, int], float]]] = {}

    for r in range(config.rows):
        for c in range(config.cols):
            if (r, c) in config.walls:
                continue

            neighbors: list[tuple[tuple[int, int], float]] = []

            for dr, dc in CARDINAL_DIRS:
                nr, nc = r + dr, c + dc
                if 0 <= nr < config.rows and 0 <= nc < config.cols and (nr, nc) not in config.walls:
                    neighbors.append(((nr, nc), CARDINAL_COST))

            if config.allow_diagonal:
                for dr, dc in DIAGONAL_DIRS:
                    nr, nc = r + dr, c + dc
                    if 0 <= nr < config.rows and 0 <= nc < config.cols and (nr, nc) not in config.walls:
                        if (r + dr, c) not in config.walls and (r, c + dc) not in config.walls:
                            neighbors.append(((nr, nc), DIAGONAL_COST))

            adj[(r, c)] = neighbors

    return adj


def coord_key(row: int, col: int) -> str:
    return f"{row},{col}"


def make_grid_step(
    config: GridConfig,
    step_index: int,
    event_type: str,
    cell_states: dict[str, str],
    exploration_order: dict[str, int],
    frontier_cells: list[list[int]],
    highlighted_entities: list[HighlightedEntity],
    metrics_snapshot: dict[str, Any],
    explanation: StepExplanation | str | None,
    path: list[list[int]] | None = None,
    distances: dict[str, float | int | str] | None = None,
    heuristic_values: dict[str, dict[str, float | str]] | None = None,
    pseudocode_lines: list[int] | None = None,
) -> TimelineStep:
    grid_meta = {
        "rows": config.rows,
        "cols": config.cols,
        "walls": [[r, c] for r, c in sorted(config.walls)],
        "allow_diagonal": config.allow_diagonal,
    }

    state_payload = {
        "cell_states": dict(cell_states),
        "exploration_order": dict(exploration_order),
        "frontier_cells": list(frontier_cells),
        "path": list(path) if path else None,
        "distances": dict(distances) if distances else None,
        "heuristic_values": {k: dict(v) for k, v in heuristic_values.items()} if heuristic_values else None,
        "grid_meta": grid_meta,
        "pseudocode_lines": pseudocode_lines or [],
    }

    return TimelineStep(
        step_index = step_index,
        event_type = event_type,
        state_payload = state_payload,
        highlighted_entities = highlighted_entities,
        metrics_snapshot = dict(metrics_snapshot),
        explanation = explanation,
        timestamp_or_order = step_index,
    )
