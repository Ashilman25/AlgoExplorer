from pydantic import ValidationError

from app.simulation.contract import BaseAlgorithm
from app.simulation.registry import register
from app.simulation.types import AlgorithmInput, AlgorithmOutput
from app.schemas.timeline import TimelineStep, HighlightedEntity
from app.schemas.payloads import GraphInputPayload
from app.exceptions import DomainError


@register("graph", "dfs")
class DFSAlgorithm(BaseAlgorithm):
    @property
    def module_type(self) -> str:
        return "graph"

    @property
    def algorithm_key(self) -> str:
        return "dfs"

    def run(self, algo_input: AlgorithmInput) -> AlgorithmOutput:
        explain = algo_input.explanation_level

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

        def add_step(event_type: str, highlighted: list[HighlightedEntity], explanation: str, frontier: list[str] | None = None, path: list[str] | None = None) -> None:
            s_payload = {
                "node_states": dict(node_states),
                "edge_states": dict(edge_states),
                "frontier": list(frontier) if frontier else [],
                "distances": None,
                "path": list(path) if path else None,
            }
            step = TimelineStep(
                step_index = len(steps),
                event_type = event_type,
                state_payload = s_payload,
                highlighted_entities = highlighted,
                metrics_snapshot = dict(metrics),
                explanation = explanation if explain != "none" else None,
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
            f"Initialize DFS from '{source}'. Push onto stack. {target_message}",
            frontier = list(stack),
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
                f"Pop '{current}' from the stack. "
                f"Exploring its {neighbors_count} neighbor(s). "
                f"({metrics['nodes_visited']} node(s) visited so far.)",
                frontier = list(stack),
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
                    f"Target '{target}' found! Path: {path_string} ({hops} hop(s)). "
                    f"Note: DFS does not guarantee the shortest path.",
                    frontier = list(stack),
                    path = path,
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
                        f"Edge {current} -> {neighbor}: '{neighbor}' is unvisited. "
                        f"Push onto stack. Stack size is now {len(stack)}.",
                        frontier = list(stack),
                    )
                else:
                    add_step(
                        "SKIP_EDGE",
                        [
                            HighlightedEntity(id = current, state = node_states[current], label = current),
                            HighlightedEntity(id = neighbor, state = node_states[neighbor], label = neighbor),
                        ],
                        f"Edge {current} -> {neighbor}: '{neighbor}' already visited. Skip.",
                        frontier = list(stack),
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
                f"DFS complete. Visited {visited_nodes} node(s), "
                f"explored {explored_edges} edge(s). {result_message}",
                frontier = [],
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
