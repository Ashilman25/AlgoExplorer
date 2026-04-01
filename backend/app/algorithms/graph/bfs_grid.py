from collections import deque

from app.simulation.contract import BaseAlgorithm
from app.simulation.registry import register
from app.simulation.types import AlgorithmInput, AlgorithmOutput
from app.simulation.explanation_builder import ExplanationBuilder
from app.schemas.timeline import HighlightedEntity
from app.algorithms.graph.grid_utils import (
    parse_grid_input, build_grid_adjacency, coord_key, make_grid_step,
)


@register("graph", "bfs_grid")
class BFSGridAlgorithm(BaseAlgorithm):
    @property
    def module_type(self) -> str:
        return "graph"

    @property
    def algorithm_key(self) -> str:
        return "bfs_grid"

    def run(self, algo_input: AlgorithmInput) -> AlgorithmOutput:
        eb = ExplanationBuilder(algo_input.explanation_level)
        config = parse_grid_input(algo_input.input_payload)
        adj = build_grid_adjacency(config)

        sr, sc = config.start
        tr, tc = config.end


        if algo_input.execution_mode == "benchmark":
            queue: deque[tuple[int, int]] = deque([config.start])
            visited: set[tuple[int, int]] = {config.start}
            parent: dict[tuple[int, int], tuple[int, int]] = {}
            metrics = {
                "cells_explored": 0,
                "frontier_max_size": 1,
                "path_length": 0,
                "total_steps": 0,
            }
            path_found = False

            while queue:
                metrics["total_steps"] += 1
                current = queue.popleft()
                metrics["cells_explored"] += 1

                if current == config.end:
                    path_found = True
                    path: list[tuple[int, int]] = []
                    node = current
                    while node != config.start:
                        path.append(node)
                        node = parent[node]
                    path.append(config.start)
                    path.reverse()
                    metrics["path_length"] = len(path)
                    break

                for (nr, nc), _ in adj[current]:
                    if (nr, nc) not in visited:
                        visited.add((nr, nc))
                        parent[(nr, nc)] = current
                        queue.append((nr, nc))
                        if len(queue) > metrics["frontier_max_size"]:
                            metrics["frontier_max_size"] = len(queue)

            return AlgorithmOutput(
                timeline_steps = [],
                final_result = {
                    "path_found": path_found,
                    "path": [],
                    "cells_explored": metrics["cells_explored"],
                },
                summary_metrics = metrics,
                algorithm_metadata = self.build_metadata(algo_input) | {
                    "time_complexity": "O(R*C)",
                    "space_complexity": "O(R*C)",
                    "allow_diagonal": config.allow_diagonal,
                    "weighted": config.weighted,
                },
            )

        # ── simulation state ────────────────────────────────
        cell_states: dict[str, str] = {
            coord_key(r, c): "default"
            for r in range(config.rows) for c in range(config.cols)
            if (r, c) not in config.walls
        }
        cell_states[coord_key(sr, sc)] = "source"
        cell_states[coord_key(tr, tc)] = "target"
        exploration_order: dict[str, int] = {}
        exploration_counter = 0

        steps = []
        metrics = {
            "cells_explored": 0,
            "frontier_max_size": 1,
            "path_length": 0,
            "total_steps": 0,
        }

        queue: deque[tuple[int, int]] = deque([config.start])
        visited: set[tuple[int, int]] = {config.start}
        parent: dict[tuple[int, int], tuple[int, int]] = {}

        # INITIALIZE
        steps.append(make_grid_step(
            config, len(steps), "INITIALIZE", cell_states, exploration_order,
            frontier_cells = [[sr, sc]],
            highlighted_entities = [
                HighlightedEntity(id = [sr, sc], state = "source", label = f"({sr},{sc})"),
            ],
            metrics_snapshot = dict(metrics),
            explanation = eb.build(
                title = f"Initialize BFS from ({sr},{sc})",
                body = f"Target is ({tr},{tc}). Queue size: 1.",
                data_snapshot = {"queue": [[sr, sc]], "visited": [[sr, sc]]},
            ),
            pseudocode_lines = [0, 1, 2, 3],
        ))

        path_found = False
        final_path: list[list[int]] | None = None

        while queue:
            metrics["total_steps"] += 1
            current = queue.popleft()
            cr, cc = current
            ck = coord_key(cr, cc)
            metrics["cells_explored"] += 1

            if cell_states[ck] not in ("source", "target"):
                cell_states[ck] = "active"
            exploration_order[ck] = exploration_counter
            exploration_counter += 1

            # DEQUEUE
            neighbors_count = len(adj[current])
            steps.append(make_grid_step(
                config, len(steps), "DEQUEUE", cell_states, exploration_order,
                frontier_cells = [[r, c] for r, c in queue],
                highlighted_entities = [
                    HighlightedEntity(id = [cr, cc], state = cell_states[ck], label = f"({cr},{cc})"),
                ],
                metrics_snapshot = dict(metrics),
                explanation = eb.build(
                    title = f"Dequeue ({cr},{cc})",
                    body = f"Exploring {neighbors_count} neighbor(s). {metrics['cells_explored']} cell(s) explored so far.",
                    data_snapshot = {"queue": [[r, c] for r, c in queue], "current": [cr, cc]},
                ),
                pseudocode_lines = [4, 5],
            ))

            # target check
            if current == config.end:
                path_cells: list[tuple[int, int]] = []
                node = current
                while node != config.start:
                    path_cells.append(node)
                    node = parent[node]
                path_cells.append(config.start)
                path_cells.reverse()
                final_path = [[r, c] for r, c in path_cells]
                metrics["path_length"] = len(final_path)

                for r, c in path_cells:
                    cell_states[coord_key(r, c)] = "success"

                highlighted_path = [
                    HighlightedEntity(id = [r, c], state = "success", label = f"({r},{c})")
                    for r, c in path_cells
                ]

                steps.append(make_grid_step(
                    config, len(steps), "PATH_FOUND", cell_states, exploration_order,
                    frontier_cells = [[r, c] for r, c in queue],
                    highlighted_entities = highlighted_path,
                    metrics_snapshot = dict(metrics),
                    explanation = eb.build(
                        title = f"Target ({tr},{tc}) found!",
                        body = f"Path length: {len(final_path)} cells. BFS guarantees shortest path on unweighted grids.",
                        data_snapshot = {"path": final_path},
                    ),
                    path = final_path,
                    pseudocode_lines = [6, 7],
                ))
                path_found = True
                break

            # explore neighbors
            for (nr, nc), _ in adj[current]:
                if (nr, nc) not in visited:
                    visited.add((nr, nc))
                    parent[(nr, nc)] = current
                    queue.append((nr, nc))
                    if len(queue) > metrics["frontier_max_size"]:
                        metrics["frontier_max_size"] = len(queue)

                    nk = coord_key(nr, nc)
                    if cell_states[nk] not in ("source", "target"):
                        cell_states[nk] = "frontier"

                    # ENQUEUE
                    steps.append(make_grid_step(
                        config, len(steps), "ENQUEUE", cell_states, exploration_order,
                        frontier_cells = [[r, c] for r, c in queue],
                        highlighted_entities = [
                            HighlightedEntity(id = [cr, cc], state = cell_states[ck], label = f"({cr},{cc})"),
                            HighlightedEntity(id = [nr, nc], state = "frontier", label = f"({nr},{nc})"),
                        ],
                        metrics_snapshot = dict(metrics),
                        explanation = eb.build(
                            title = f"Enqueue ({nr},{nc})",
                            body = f"Unvisited neighbor of ({cr},{cc}). Frontier size: {len(queue)}.",
                            data_snapshot = {"queue": [[r, c] for r, c in queue], "enqueued": [nr, nc]},
                        ),
                        pseudocode_lines = [8, 9, 10],
                    ))

            if cell_states[ck] not in ("source", "target", "success"):
                cell_states[ck] = "visited"

        # COMPLETE
        if not path_found:
            steps.append(make_grid_step(
                config, len(steps), "COMPLETE", cell_states, exploration_order,
                frontier_cells = [],
                highlighted_entities = [],
                metrics_snapshot = dict(metrics),
                explanation = eb.build(
                    title = "BFS complete",
                    body = f"No path found to ({tr},{tc}). Explored {metrics['cells_explored']} cell(s).",
                    data_snapshot = {"cells_explored": metrics["cells_explored"]},
                ),
                pseudocode_lines = [11],
            ))

        final_result = {
            "path_found": path_found,
            "path": final_path or [],
            "cells_explored": metrics["cells_explored"],
        }

        alg_metadata = self.build_metadata(algo_input) | {
            "time_complexity": "O(R*C)",
            "space_complexity": "O(R*C)",
            "allow_diagonal": config.allow_diagonal,
            "weighted": config.weighted,
        }

        return AlgorithmOutput(
            timeline_steps = steps,
            final_result = final_result,
            summary_metrics = metrics,
            algorithm_metadata = alg_metadata,
        )
