from pydantic import ValidationError

from app.simulation.contract import BaseAlgorithm
from app.simulation.registry import register
from app.simulation.types import AlgorithmInput, AlgorithmOutput
from app.schemas.timeline import TimelineStep, HighlightedEntity
from app.schemas.payloads import GraphInputPayload
from app.exceptions import DomainError
from app.simulation.explanation_builder import ExplanationBuilder


@register("graph", "dfs")
class DFSAlgorithm(BaseAlgorithm):
    @property
    def module_type(self) -> str:
        return "graph"

    @property
    def algorithm_key(self) -> str:
        return "dfs"

    def run(self, algo_input: AlgorithmInput) -> AlgorithmOutput:
        eb = ExplanationBuilder(algo_input.explanation_level)

        try:
            graph_input = GraphInputPayload.model_validate(algo_input.input_payload)
        except ValidationError as e:
            raise DomainError("Invalid graph input.", details = {"errors": e.errors()})

        node_ids: list[str] = [str(n.id) for n in graph_input.nodes]
        source: str = str(graph_input.source)
        target: str | None = str(graph_input.target) if graph_input.target is not None else None

        if source not in node_ids:
            raise DomainError(f"Source node '{source}' not found in node list")
        if target and target not in node_ids:
            raise DomainError(f"Target node '{target}' not found in node list")

        # adjacency list
        adj: dict[str, list[str]] = {n: [] for n in node_ids}
        for e in graph_input.edges:
            u, v = str(e.source), str(e.target)
            adj[u].append(v)
            if not graph_input.directed:
                adj[v].append(u)

        # ── benchmark fast path ─────────────────────────────
        if algo_input.execution_mode == "benchmark":
            stack: list[str] = [source]
            visited: set[str] = {source}
            metrics = {"nodes_visited": 0, "edges_explored": 0, "stack_max_size": 1}
            path_found = False

            while stack:
                current = stack.pop()
                metrics["nodes_visited"] += 1

                if target and current == target:
                    path_found = True
                    break

                for neighbor in reversed(adj[current]):
                    metrics["edges_explored"] += 1
                    if neighbor not in visited:
                        visited.add(neighbor)
                        stack.append(neighbor)
                        if len(stack) > metrics["stack_max_size"]:
                            metrics["stack_max_size"] = len(stack)

            return AlgorithmOutput(
                timeline_steps = [],
                final_result = {"path_found": path_found, "path": [], "nodes_visited": metrics["nodes_visited"]},
                summary_metrics = metrics,
                algorithm_metadata = self.build_metadata(algo_input),
            )

        # simulation state
        node_states: dict[str, str] = {n: "default" for n in node_ids}
        edge_states: dict[str, str] = {}
        steps: list[TimelineStep] = []
        metrics = {
            "nodes_visited": 0,
            "edges_explored": 0,
            "stack_max_size": 0,
        }

        def ek(a: str, b: str) -> str:
            return f"{a}-{b}"

        def add_step(event_type: str, highlighted: list[HighlightedEntity], explanation: str, frontier: list[str] | None = None, path: list[str] | None = None, pseudocode_lines: list[int] | None = None) -> None:
            if algo_input.execution_mode == "benchmark":
                return
            s_payload = {
                "node_states": dict(node_states),
                "edge_states": dict(edge_states),
                "frontier": list(frontier) if frontier else [],
                "distances": None,
                "path": list(path) if path else None,
                "pseudocode_lines": pseudocode_lines or [],
            }
            step = TimelineStep(
                step_index = len(steps),
                event_type = event_type,
                state_payload = s_payload,
                highlighted_entities = highlighted,
                metrics_snapshot = dict(metrics),
                explanation = explanation,
                timestamp_or_order = len(steps),
            )
            steps.append(step)

        # initialize
        node_states[source] = "source"
        if target:
            node_states[target] = "target"

        stack: list[str] = [source]
        visited: set[str] = {source}
        parent: dict[str, str] = {}
        metrics["stack_max_size"] = 1

        target_message = f"Searching for target '{target}'." if target else "Visiting all reachable nodes."
        add_step(
            "INITIALIZE",
            [HighlightedEntity(id = source, state = "source", label = source)],
            eb.build(
                title = f"Initialize DFS from '{source}'",
                body = f"Push '{source}' onto stack. {target_message}",
                data_snapshot = {
                    "stack": list(stack),
                    "visited": sorted(visited),
                },
            ),
            frontier = list(stack),
            pseudocode_lines = [0, 1, 2, 3],
        )

        path_found = False
        final_path: list[str] | None = None

        # main DFS loop (stack-based, iterative)
        while stack:
            current = stack.pop()
            metrics["nodes_visited"] += 1

            if node_states[current] not in ("source", "target"):
                node_states[current] = "active"

            neighbors_count = len(adj[current])
            add_step(
                "POP",
                [HighlightedEntity(id = current, state = node_states[current], label = current)],
                eb.build(
                    title = f"Pop '{current}' from stack",
                    body = f"{neighbors_count} neighbor(s) to explore. {metrics['nodes_visited']} node(s) visited so far.",
                    data_snapshot = {
                        "stack": list(stack),
                        "visited": sorted(visited),
                        "current_neighbors": list(adj[current]),
                    },
                ),
                frontier = list(stack),
                pseudocode_lines = [4, 5, 6, 7],
            )

            # target check
            if target and current == target:
                path: list[str] = []
                node = current
                while node != source:
                    path.append(node)
                    node = parent[node]
                path.append(source)
                path.reverse()
                final_path = path

                for p in path:
                    node_states[p] = "success"
                for i in range(len(path) - 1):
                    edge_states[ek(path[i], path[i + 1])] = "success"
                    edge_states[ek(path[i + 1], path[i])] = "success"

                path_string = " -> ".join(path)
                hops = len(path) - 1
                highlighted_path = [HighlightedEntity(id = n, state = "success", label = n) for n in path]
                add_step(
                    "PATH_FOUND",
                    highlighted_path,
                    eb.build(
                        title = f"Target '{target}' found",
                        body = f"Path: {path_string} ({hops} hop(s)). DFS does not guarantee the shortest path.",
                        data_snapshot = {
                            "stack": list(stack),
                            "visited": sorted(visited),
                        },
                    ),
                    frontier = list(stack),
                    path = path,
                    pseudocode_lines = [8],
                )
                path_found = True
                break

            # explore neighbors (reversed so left-most neighbor is explored first)
            for neighbor in reversed(adj[current]):
                metrics["edges_explored"] += 1

                if neighbor not in visited:
                    visited.add(neighbor)
                    parent[neighbor] = current
                    stack.append(neighbor)

                    if len(stack) > metrics["stack_max_size"]:
                        metrics["stack_max_size"] = len(stack)

                    edge_states[ek(current, neighbor)] = "frontier"
                    edge_states[ek(neighbor, current)] = "frontier"
                    if node_states[neighbor] not in ("source", "target"):
                        node_states[neighbor] = "frontier"

                    add_step(
                        "PUSH",
                        [
                            HighlightedEntity(id = current, state = node_states[current], label = current),
                            HighlightedEntity(id = neighbor, state = "frontier", label = neighbor),
                        ],
                        eb.build(
                            title = f"Push '{neighbor}' onto stack",
                            body = f"Edge {current} -> {neighbor}: '{neighbor}' is unvisited. Stack size is now {len(stack)}.",
                            data_snapshot = {
                                "stack": list(stack),
                                "visited": sorted(visited),
                                "current_neighbors": list(adj[current]),
                            },
                        ),
                        frontier = list(stack),
                        pseudocode_lines = [9, 10, 11],
                    )
                else:
                    add_step(
                        "SKIP_EDGE",
                        [
                            HighlightedEntity(id = current, state = node_states[current], label = current),
                            HighlightedEntity(id = neighbor, state = node_states[neighbor], label = neighbor),
                        ],
                        eb.build(
                            title = f"Skip '{neighbor}'",
                            body = f"Edge {current} -> {neighbor}: '{neighbor}' already visited.",
                            data_snapshot = {
                                "stack": list(stack),
                                "visited": sorted(visited),
                            },
                        ),
                        frontier = list(stack),
                        pseudocode_lines = [9, 10],
                    )

            if node_states[current] not in ("source", "target", "success"):
                node_states[current] = "visited"

        # complete
        if not path_found:
            visited_nodes = metrics["nodes_visited"]
            explored_edges = metrics["edges_explored"]
            result_message = f"No path found to '{target}'." if target else "All reachable nodes visited."
            add_step(
                "COMPLETE",
                [],
                eb.build(
                    title = "DFS complete",
                    body = f"Visited {visited_nodes} node(s), explored {explored_edges} edge(s). {result_message}",
                    data_snapshot = {
                        "stack": list(stack),
                        "visited": sorted(visited),
                    },
                ),
                frontier = [],
                pseudocode_lines = [12],
            )

        final_result = {
            "path_found": path_found,
            "path": final_path or [],
            "nodes_visited": metrics["nodes_visited"],
        }

        alg_metadata = self.build_metadata(algo_input) | {
            "time_complexity": "O(V + E)",
            "space_complexity": "O(V)",
            "weighted": graph_input.weighted,
            "directed": graph_input.directed,
        }

        return AlgorithmOutput(
            timeline_steps = steps,
            final_result = final_result,
            summary_metrics = metrics,
            algorithm_metadata = alg_metadata,
        )
