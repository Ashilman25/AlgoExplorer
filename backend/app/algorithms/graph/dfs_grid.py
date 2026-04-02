from app.simulation.contract import BaseAlgorithm
from app.simulation.registry import register
from app.simulation.types import AlgorithmInput, AlgorithmOutput
from app.simulation.explanation_builder import ExplanationBuilder
from app.schemas.timeline import HighlightedEntity
from app.algorithms.graph.grid_utils import (
    parse_grid_input, build_grid_adjacency, coord_key, make_grid_step,
)


@register("graph", "dfs_grid")
class DFSGridAlgorithm(BaseAlgorithm):
    @property
    def module_type(self) -> str:
        return "graph"

    @property
    def algorithm_key(self) -> str:
        return "dfs_grid"

    def run(self, algo_input: AlgorithmInput) -> AlgorithmOutput:
        eb = ExplanationBuilder(algo_input.explanation_level)
        config = parse_grid_input(algo_input.input_payload)
        adj = build_grid_adjacency(config)

        sr, sc = config.start
        tr, tc = config.end

        # precompute neighbor sets for O(1) adjacency checks during backtracking
        neighbor_sets: dict[tuple[int, int], set[tuple[int, int]]] = {
            cell: {n for n, _ in neighbors} for cell, neighbors in adj.items()
        }

        # ── benchmark fast path ─────────────────────────────
        if algo_input.execution_mode == "benchmark":
            stack: list[tuple[int, int]] = [config.start]
            visited: set[tuple[int, int]] = set()
            path_stack: list[tuple[int, int]] = []
            metrics = {
                "cells_explored": 0,
                "frontier_max_size": 1,
                "path_length": 0,
                "total_steps": 0,
                "stack_depth": 0,
            }
            path_found = False

            while stack:
                metrics["total_steps"] += 1
                current = stack.pop()

                if current in visited:
                    continue

                visited.add(current)
                metrics["cells_explored"] += 1

                while path_stack and current not in neighbor_sets.get(path_stack[-1], set()):
                    path_stack.pop()
                path_stack.append(current)
                metrics["stack_depth"] = len(path_stack)

                if current == config.end:
                    path_found = True
                    metrics["path_length"] = len(path_stack)
                    break

                for (nr, nc), _ in reversed(adj[current]):
                    if (nr, nc) not in visited:
                        stack.append((nr, nc))
                        if len(stack) > metrics["frontier_max_size"]:
                            metrics["frontier_max_size"] = len(stack)

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
            "stack_depth": 0,
        }

        stack: list[tuple[int, int]] = [config.start]
        visited: set[tuple[int, int]] = set()
        path_stack: list[tuple[int, int]] = []

        # INITIALIZE
        steps.append(make_grid_step(
            config, len(steps), "INITIALIZE", cell_states, exploration_order,
            frontier_cells = [[sr, sc]],
            highlighted_entities = [
                HighlightedEntity(id = [sr, sc], state = "source", label = f"({sr},{sc})"),
            ],
            metrics_snapshot = dict(metrics),
            explanation = eb.build(
                title = f"Initialize DFS from ({sr},{sc})",
                body = f"Target is ({tr},{tc}). Stack size: 1.",
                data_snapshot = {"stack": [[sr, sc]]},
            ),
            pseudocode_lines = [0, 1, 2, 3],
        ))

        path_found = False
        final_path: list[list[int]] | None = None

        while stack:
            metrics["total_steps"] += 1
            current = stack.pop()
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

            # backtrack path_stack
            while path_stack and current not in neighbor_sets.get(path_stack[-1], set()):
                bt = path_stack.pop()
                br, bc = bt
                bk = coord_key(br, bc)
                if cell_states[bk] not in ("source", "target"):
                    cell_states[bk] = "visited"

                returning_to = f"({path_stack[-1][0]},{path_stack[-1][1]})" if path_stack else "start"
                steps.append(make_grid_step(
                    config, len(steps), "BACKTRACK", cell_states, exploration_order,
                    frontier_cells = [[r, c] for r, c in stack if (r, c) not in visited],
                    highlighted_entities = [
                        HighlightedEntity(id = [br, bc], state = "visited", label = f"({br},{bc})"),
                    ],
                    metrics_snapshot = dict(metrics),
                    explanation = eb.build(
                        title = f"Backtrack from ({br},{bc})",
                        body = f"Dead end — returning to {returning_to}.",
                        data_snapshot = {"path_stack": [[r, c] for r, c in path_stack]},
                    ),
                    pseudocode_lines = [4, 5],
                ))

            path_stack.append(current)
            metrics["stack_depth"] = len(path_stack)

            # POP step
            steps.append(make_grid_step(
                config, len(steps), "POP", cell_states, exploration_order,
                frontier_cells = [[r, c] for r, c in stack if (r, c) not in visited],
                highlighted_entities = [
                    HighlightedEntity(id = [cr, cc], state = cell_states[ck], label = f"({cr},{cc})"),
                ],
                metrics_snapshot = dict(metrics),
                explanation = eb.build(
                    title = f"Pop ({cr},{cc}) from stack",
                    body = f"Depth: {len(path_stack)}. {metrics['cells_explored']} cell(s) explored.",
                    data_snapshot = {
                        "stack": [[r, c] for r, c in stack],
                        "path_stack": [[r, c] for r, c in path_stack],
                    },
                ),
                pseudocode_lines = [6, 7],
            ))

            # target check
            if current == config.end:
                final_path = [[r, c] for r, c in path_stack]
                metrics["path_length"] = len(final_path)

                for r, c in path_stack:
                    cell_states[coord_key(r, c)] = "success"

                highlighted_path = [
                    HighlightedEntity(id = [r, c], state = "success", label = f"({r},{c})")
                    for r, c in path_stack
                ]

                steps.append(make_grid_step(
                    config, len(steps), "PATH_FOUND", cell_states, exploration_order,
                    frontier_cells = [[r, c] for r, c in stack if (r, c) not in visited],
                    highlighted_entities = highlighted_path,
                    metrics_snapshot = dict(metrics),
                    explanation = eb.build(
                        title = f"Target ({tr},{tc}) found!",
                        body = f"Path length: {len(final_path)} cells. Note: DFS does not guarantee the shortest path.",
                        data_snapshot = {"path": final_path},
                    ),
                    path = final_path,
                    pseudocode_lines = [8],
                ))
                path_found = True
                break

            # push neighbors (reversed for consistent exploration order)
            for (nr, nc), _ in reversed(adj[current]):
                if (nr, nc) not in visited:
                    stack.append((nr, nc))
                    if len(stack) > metrics["frontier_max_size"]:
                        metrics["frontier_max_size"] = len(stack)

                    nk = coord_key(nr, nc)
                    if cell_states[nk] not in ("source", "target"):
                        cell_states[nk] = "frontier"

                    steps.append(make_grid_step(
                        config, len(steps), "PUSH", cell_states, exploration_order,
                        frontier_cells = [[r, c] for r, c in stack if (r, c) not in visited],
                        highlighted_entities = [
                            HighlightedEntity(id = [cr, cc], state = cell_states[ck], label = f"({cr},{cc})"),
                            HighlightedEntity(id = [nr, nc], state = "frontier", label = f"({nr},{nc})"),
                        ],
                        metrics_snapshot = dict(metrics),
                        explanation = eb.build(
                            title = f"Push ({nr},{nc}) onto stack",
                            body = f"Unvisited neighbor of ({cr},{cc}). Stack size: {len(stack)}.",
                            data_snapshot = {"stack": [[r, c] for r, c in stack], "pushed": [nr, nc]},
                        ),
                        pseudocode_lines = [9, 10, 11],
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
                    title = "DFS complete",
                    body = f"No path found to ({tr},{tc}). Explored {metrics['cells_explored']} cell(s).",
                    data_snapshot = {"cells_explored": metrics["cells_explored"]},
                ),
                pseudocode_lines = [12],
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
