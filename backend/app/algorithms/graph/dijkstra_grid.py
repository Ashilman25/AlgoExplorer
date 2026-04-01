import heapq
import math

from app.simulation.contract import BaseAlgorithm
from app.simulation.registry import register
from app.simulation.types import AlgorithmInput, AlgorithmOutput
from app.simulation.explanation_builder import ExplanationBuilder
from app.schemas.timeline import HighlightedEntity
from app.algorithms.graph.grid_utils import (
    parse_grid_input, build_grid_adjacency, coord_key, make_grid_step,
)


@register("graph", "dijkstra_grid")
class DijkstraGridAlgorithm(BaseAlgorithm):
    @property
    def module_type(self) -> str:
        return "graph"

    @property
    def algorithm_key(self) -> str:
        return "dijkstra_grid"

    def run(self, algo_input: AlgorithmInput) -> AlgorithmOutput:
        eb = ExplanationBuilder(algo_input.explanation_level)
        config = parse_grid_input(algo_input.input_payload)
        adj = build_grid_adjacency(config)

        sr, sc = config.start
        tr, tc = config.end

        # ── benchmark fast path ─────────────────────────────
        if algo_input.execution_mode == "benchmark":
            distances: dict[tuple[int, int], float] = {config.start: 0}
            visited: set[tuple[int, int]] = set()
            parent: dict[tuple[int, int], tuple[int, int]] = {}
            counter = 0
            heap: list[tuple[float, int, tuple[int, int]]] = [(0, counter, config.start)]
            metrics = {
                "cells_explored": 0,
                "frontier_max_size": 1,
                "path_length": 0,
                "total_steps": 0,
            }
            path_found = False

            while heap:
                metrics["total_steps"] += 1
                current_dist, _, current = heapq.heappop(heap)

                if current in visited:
                    continue

                visited.add(current)
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

                for (nr, nc), cost in adj[current]:
                    if (nr, nc) in visited:
                        continue
                    new_dist = current_dist + cost
                    if new_dist < distances.get((nr, nc), math.inf):
                        distances[(nr, nc)] = new_dist
                        parent[(nr, nc)] = current
                        counter += 1
                        heapq.heappush(heap, (new_dist, counter, (nr, nc)))
                        if len(heap) > metrics["frontier_max_size"]:
                            metrics["frontier_max_size"] = len(heap)

            return AlgorithmOutput(
                timeline_steps = [],
                final_result = {
                    "path_found": path_found,
                    "path": [],
                    "cells_explored": metrics["cells_explored"],
                },
                summary_metrics = metrics,
                algorithm_metadata = self.build_metadata(algo_input) | {
                    "time_complexity": "O(R*C * log(R*C))",
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

        distances: dict[tuple[int, int], float] = {config.start: 0}
        parent: dict[tuple[int, int], tuple[int, int]] = {}

        steps = []
        metrics = {
            "cells_explored": 0,
            "frontier_max_size": 1,
            "path_length": 0,
            "total_steps": 0,
        }

        counter = 0
        heap: list[tuple[float, int, tuple[int, int]]] = [(0, counter, config.start)]
        visited: set[tuple[int, int]] = set()

        def dist_display() -> dict[str, float | str]:
            result: dict[str, float | str] = {}
            for (r, c), d in distances.items():
                result[coord_key(r, c)] = round(d, 2) if d != math.inf else "inf"
            return result

        # INITIALIZE
        steps.append(make_grid_step(
            config, len(steps), "INITIALIZE", cell_states, exploration_order,
            frontier_cells = [[sr, sc]],
            highlighted_entities = [
                HighlightedEntity(id = [sr, sc], state = "source", label = f"({sr},{sc})"),
            ],
            metrics_snapshot = dict(metrics),
            explanation = eb.build(
                title = f"Initialize Dijkstra from ({sr},{sc})",
                body = f"Set dist[({sr},{sc})] = 0, all others = inf. Target is ({tr},{tc}).",
                data_snapshot = {"distances": dist_display(), "heap_size": 1},
            ),
            distances = dist_display(),
            pseudocode_lines = [0, 1, 2, 3],
        ))

        path_found = False
        final_path: list[list[int]] | None = None

        while heap:
            metrics["total_steps"] += 1
            current_dist, _, current = heapq.heappop(heap)
            cr, cc = current

            if current in visited:
                continue

            visited.add(current)
            ck = coord_key(cr, cc)
            metrics["cells_explored"] += 1

            if cell_states[ck] not in ("source", "target"):
                cell_states[ck] = "active"
            exploration_order[ck] = exploration_counter
            exploration_counter += 1

            # POP_MIN
            neighbors_count = len(adj[current])
            steps.append(make_grid_step(
                config, len(steps), "POP_MIN", cell_states, exploration_order,
                frontier_cells = [[r, c] for _, _, (r, c) in heap],
                highlighted_entities = [
                    HighlightedEntity(id = [cr, cc], state = cell_states[ck], label = f"({cr},{cc})"),
                ],
                metrics_snapshot = dict(metrics),
                explanation = eb.build(
                    title = f"Pop ({cr},{cc}) with distance {round(current_dist, 2)}",
                    body = f"Exploring {neighbors_count} neighbor(s). {metrics['cells_explored']} cell(s) finalized.",
                    data_snapshot = {"distances": dist_display(), "heap_size": len(heap)},
                ),
                distances = dist_display(),
                pseudocode_lines = [4, 5, 6],
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
                    frontier_cells = [[r, c] for _, _, (r, c) in heap],
                    highlighted_entities = highlighted_path,
                    metrics_snapshot = dict(metrics),
                    explanation = eb.build(
                        title = f"Target ({tr},{tc}) reached!",
                        body = f"Shortest distance: {round(current_dist, 2)}. Path length: {len(final_path)} cells.",
                        data_snapshot = {"path": final_path, "distances": dist_display()},
                    ),
                    distances = dist_display(),
                    path = final_path,
                    pseudocode_lines = [7],
                ))
                path_found = True
                break

            # explore neighbors
            for (nr, nc), cost in adj[current]:
                if (nr, nc) in visited:
                    continue  # skip silently — reduces grid timeline noise

                new_dist = current_dist + cost
                old_dist = distances.get((nr, nc), math.inf)

                if new_dist < old_dist:
                    distances[(nr, nc)] = new_dist
                    parent[(nr, nc)] = current
                    counter += 1
                    heapq.heappush(heap, (new_dist, counter, (nr, nc)))
                    if len(heap) > metrics["frontier_max_size"]:
                        metrics["frontier_max_size"] = len(heap)

                    nk = coord_key(nr, nc)
                    if cell_states[nk] not in ("source", "target"):
                        cell_states[nk] = "frontier"

                    old_label = "inf" if old_dist == math.inf else str(round(old_dist, 2))

                    # RELAX
                    steps.append(make_grid_step(
                        config, len(steps), "RELAX", cell_states, exploration_order,
                        frontier_cells = [[r, c] for _, _, (r, c) in heap],
                        highlighted_entities = [
                            HighlightedEntity(id = [cr, cc], state = cell_states[ck], label = f"({cr},{cc})"),
                            HighlightedEntity(id = [nr, nc], state = "frontier", label = f"({nr},{nc})"),
                        ],
                        metrics_snapshot = dict(metrics),
                        explanation = eb.build(
                            title = f"Relax ({nr},{nc}) via ({cr},{cc})",
                            body = f"Distance: {old_label} -> {round(new_dist, 2)}. Pushed to heap.",
                            data_snapshot = {"distances": dist_display(), "edge_cost": cost},
                        ),
                        distances = dist_display(),
                        pseudocode_lines = [8, 9, 10, 11],
                    ))
                else:
                    # NO_RELAX
                    steps.append(make_grid_step(
                        config, len(steps), "NO_RELAX", cell_states, exploration_order,
                        frontier_cells = [[r, c] for _, _, (r, c) in heap],
                        highlighted_entities = [
                            HighlightedEntity(id = [cr, cc], state = cell_states[ck], label = f"({cr},{cc})"),
                            HighlightedEntity(
                                id = [nr, nc],
                                state = cell_states.get(coord_key(nr, nc), "default"),
                                label = f"({nr},{nc})",
                            ),
                        ],
                        metrics_snapshot = dict(metrics),
                        explanation = eb.build(
                            title = f"No improvement for ({nr},{nc})",
                            body = f"Current distance {round(old_dist, 2)} <= {round(new_dist, 2)}.",
                            data_snapshot = {"distances": dist_display()},
                        ),
                        distances = dist_display(),
                        pseudocode_lines = [8, 9],
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
                    title = "Dijkstra complete",
                    body = f"No path found to ({tr},{tc}). Explored {metrics['cells_explored']} cell(s).",
                    data_snapshot = {"cells_explored": metrics["cells_explored"], "distances": dist_display()},
                ),
                distances = dist_display(),
                pseudocode_lines = [12],
            ))

        path_cost = round(distances.get(config.end, math.inf), 2) if path_found else None

        final_result = {
            "path_found": path_found,
            "path": final_path or [],
            "path_cost": path_cost,
            "cells_explored": metrics["cells_explored"],
        }

        alg_metadata = self.build_metadata(algo_input) | {
            "time_complexity": "O(R*C * log(R*C))",
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
