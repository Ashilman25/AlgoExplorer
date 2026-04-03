import heapq
import math

from pydantic import ValidationError

from app.simulation.contract import BaseAlgorithm
from app.simulation.registry import register
from app.simulation.types import AlgorithmInput, AlgorithmOutput
from app.schemas.timeline import TimelineStep, HighlightedEntity
from app.schemas.payloads import GraphInputPayload
from app.exceptions import DomainError
from app.simulation.explanation_builder import ExplanationBuilder
from app.benchmark.graph_inputs import parse_benchmark_graph


@register("graph", "astar")
class AStarAlgorithm(BaseAlgorithm):
    @property
    def module_type(self) -> str:
        return "graph"

    @property
    def algorithm_key(self) -> str:
        return "astar"

    def run(self, algo_input: AlgorithmInput) -> AlgorithmOutput:
        # ── benchmark fast path ─────────────────────────────
        if algo_input.execution_mode == "benchmark":
            bg = parse_benchmark_graph(algo_input.input_payload)

            adj: dict[str, list[tuple[str, float]]] = {n: [] for n in bg.node_ids}
            for u, v, w in bg.edges:
                adj[u].append((v, w))
                if not bg.directed:
                    adj[v].append((u, w))

            coords = bg.coords

            def heuristic(node_id: str) -> float:
                if bg.target is None:
                    return 0.0
                nx, ny = coords[node_id]
                tx, ty = coords[bg.target]
                return math.sqrt((nx - tx) ** 2 + (ny - ty) ** 2)

            g_scores: dict[str, float] = {n: math.inf for n in bg.node_ids}
            g_scores[bg.source] = 0
            visited: set[str] = set()
            counter = 0
            heap: list[tuple[float, int, str]] = [(heuristic(bg.source), counter, bg.source)]
            metrics = {"nodes_visited": 0, "edges_explored": 0, "heuristic_evaluations": len(bg.node_ids), "heap_max_size": 1}
            path_found = False

            while heap:
                _, _, current = heapq.heappop(heap)

                if current in visited:
                    continue

                visited.add(current)
                metrics["nodes_visited"] += 1

                if bg.target and current == bg.target:
                    path_found = True
                    break

                for neighbor, weight in adj[current]:
                    metrics["edges_explored"] += 1
                    if neighbor in visited:
                        continue
                    new_g = g_scores[current] + weight
                    if new_g < g_scores[neighbor]:
                        g_scores[neighbor] = new_g
                        counter += 1
                        heapq.heappush(heap, (new_g + heuristic(neighbor), counter, neighbor))
                        if len(heap) > metrics["heap_max_size"]:
                            metrics["heap_max_size"] = len(heap)

            return AlgorithmOutput(
                timeline_steps = [],
                final_result = {"path_found": path_found, "path": [], "nodes_visited": metrics["nodes_visited"]},
                summary_metrics = metrics,
                algorithm_metadata = self.build_metadata(algo_input),
            )

        # ── simulation path ─────────────────────────────────
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

        # build coordinate map
        coords: dict[str, tuple[float, float]] = {}
        for n in graph_input.nodes:
            nid = str(n.id)
            if n.x is None or n.y is None:
                raise DomainError(f"A* requires coordinates on node '{nid}'")
            coords[nid] = (n.x, n.y)

        # heuristic: Euclidean distance to target
        def heuristic(node_id: str) -> float:
            if target is None:
                return 0.0
            nx, ny = coords[node_id]
            tx, ty = coords[target]
            return math.sqrt((nx - tx) ** 2 + (ny - ty) ** 2)

        # adjacency list (weighted)
        adj: dict[str, list[tuple[str, float]]] = {n: [] for n in node_ids}
        for e in graph_input.edges:
            u, v = str(e.source), str(e.target)
            w = e.weight if e.weight is not None else 1.0
            adj[u].append((v, w))
            if not graph_input.directed:
                adj[v].append((u, w))

        # simulation state
        node_states: dict[str, str] = {n: "default" for n in node_ids}
        edge_states: dict[str, str] = {}
        g_scores: dict[str, float] = {n: math.inf for n in node_ids}
        h_scores: dict[str, float] = {n: heuristic(n) for n in node_ids}
        f_scores: dict[str, float] = {n: math.inf for n in node_ids}
        parent: dict[str, str | None] = {n: None for n in node_ids}

        steps: list[TimelineStep] = []
        metrics = {
            "nodes_visited": 0,
            "edges_explored": 0,
            "heuristic_evaluations": len(node_ids),
            "heap_max_size": 0,
        }

        def ek(a: str, b: str) -> str:
            return f"{a}-{b}"

        def heuristic_display() -> dict[str, dict[str, float | str]]:
            result = {}
            for n in node_ids:
                g = g_scores[n]
                h = h_scores[n]
                f = f_scores[n]
                result[n] = {
                    "g": round(g, 2) if g != math.inf else "inf",
                    "h": round(h, 2),
                    "f": round(f, 2) if f != math.inf else "inf",
                }
            return result

        def dist_display() -> dict[str, float | str]:
            result = {}
            for n, d in g_scores.items():
                result[n] = round(d, 2) if d != math.inf else "inf"
            return result

        def add_step(event_type: str, highlighted: list[HighlightedEntity], explanation: str, path: list[str] | None = None, pseudocode_lines: list[int] | None = None) -> None:
            if algo_input.execution_mode == "benchmark":
                return
            s_payload = {
                "node_states": dict(node_states),
                "edge_states": dict(edge_states),
                "frontier": [],
                "distances": dist_display(),
                "path": list(path) if path else None,
                "heuristic_values": heuristic_display(),
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
        g_scores[source] = 0
        f_scores[source] = h_scores[source]
        node_states[source] = "source"
        if target:
            node_states[target] = "target"

        counter = 0
        heap: list[tuple[float, int, str]] = [(f_scores[source], counter, source)]
        metrics["heap_max_size"] = 1

        target_message = f"Searching for shortest path to '{target}'." if target else "Computing shortest paths to all reachable nodes."
        add_step(
            "INITIALIZE",
            [HighlightedEntity(id = source, state = "source", label = source)],
            eb.build(
                title = f"Initialize A* from '{source}'",
                body = f"h({source}) = {round(h_scores[source], 2)}, f({source}) = {round(f_scores[source], 2)}. {target_message}",
                data_snapshot = {
                    "distances": dist_display(),
                    "f_scores": {n: round(f_scores[n], 2) if f_scores[n] != math.inf else "inf" for n in node_ids},
                    "open_set_size": len(heap),
                    "visited": [],
                    "heuristic_value": round(h_scores[source], 2),
                },
            ),
            pseudocode_lines = [0, 1, 2, 3, 4],
        )

        path_found = False
        final_path: list[str] | None = None
        visited: set[str] = set()

        # main loop
        while heap:
            current_f, _, current = heapq.heappop(heap)

            if current in visited:
                continue

            visited.add(current)
            metrics["nodes_visited"] += 1

            if node_states[current] not in ("source", "target"):
                node_states[current] = "active"

            neighbors_count = len(adj[current])
            add_step(
                "POP_MIN",
                [HighlightedEntity(id = current, state = node_states[current], label = current)],
                eb.build(
                    title = f"Pop '{current}' (f={round(current_f, 2)})",
                    body = f"g={round(g_scores[current], 2)}, h={round(h_scores[current], 2)}. {neighbors_count} outgoing edge(s). {metrics['nodes_visited']} node(s) finalized.",
                    data_snapshot = {
                        "distances": dist_display(),
                        "f_scores": {n: round(f_scores[n], 2) if f_scores[n] != math.inf else "inf" for n in node_ids},
                        "open_set_size": len(heap),
                        "visited": sorted(visited),
                        "current_neighbors": [nb for nb, _ in adj[current]],
                        "heuristic_value": round(h_scores[current], 2),
                    },
                ),
                pseudocode_lines = [5, 6],
            )

            # target check
            if target and current == target:
                path: list[str] = []
                node = current
                while node is not None:
                    path.append(node)
                    node = parent[node]
                path.reverse()
                final_path = path

                for p in path:
                    node_states[p] = "success"
                for i in range(len(path) - 1):
                    edge_states[ek(path[i], path[i + 1])] = "success"
                    edge_states[ek(path[i + 1], path[i])] = "success"

                path_string = " -> ".join(path)
                highlighted_path = [HighlightedEntity(id = n, state = "success", label = n) for n in path]
                add_step(
                    "PATH_FOUND",
                    highlighted_path,
                    eb.build(
                        title = f"Target '{target}' reached",
                        body = f"Shortest path: {path_string} (cost {round(g_scores[target], 2)}). A* guarantees optimality with an admissible heuristic.",
                        data_snapshot = {
                            "distances": dist_display(),
                            "f_scores": {n: round(f_scores[n], 2) if f_scores[n] != math.inf else "inf" for n in node_ids},
                            "visited": sorted(visited),
                        },
                    ),
                    path = path,
                    pseudocode_lines = [7],
                )
                path_found = True
                break

            # explore neighbors
            for neighbor, weight in adj[current]:
                metrics["edges_explored"] += 1
                new_g = g_scores[current] + weight

                if neighbor in visited:
                    add_step(
                        "SKIP_EDGE",
                        [
                            HighlightedEntity(id = current, state = node_states[current], label = current),
                            HighlightedEntity(id = neighbor, state = node_states[neighbor], label = neighbor),
                        ],
                        eb.build(
                            title = f"Skip '{neighbor}'",
                            body = f"Edge {current} -> {neighbor} (w={weight}): '{neighbor}' already finalized.",
                            data_snapshot = {
                                "distances": dist_display(),
                                "visited": sorted(visited),
                            },
                        ),
                        pseudocode_lines = [8, 9],
                    )
                    continue

                if new_g < g_scores[neighbor]:
                    old_g = g_scores[neighbor]
                    g_scores[neighbor] = new_g
                    f_scores[neighbor] = new_g + h_scores[neighbor]
                    parent[neighbor] = current

                    counter += 1
                    heapq.heappush(heap, (f_scores[neighbor], counter, neighbor))
                    if len(heap) > metrics["heap_max_size"]:
                        metrics["heap_max_size"] = len(heap)

                    edge_states[ek(current, neighbor)] = "frontier"
                    edge_states[ek(neighbor, current)] = "frontier"
                    if node_states[neighbor] not in ("source", "target"):
                        node_states[neighbor] = "frontier"

                    old_label = "inf" if old_g == math.inf else str(round(old_g, 2))
                    add_step(
                        "RELAX",
                        [
                            HighlightedEntity(id = current, state = node_states[current], label = current),
                            HighlightedEntity(id = neighbor, state = "frontier", label = neighbor),
                        ],
                        eb.build(
                            title = f"Relax edge {current} -> {neighbor}",
                            body = f"g[{neighbor}]: {old_label} -> {round(new_g, 2)}. f={round(f_scores[neighbor], 2)} (g={round(new_g, 2)} + h={round(h_scores[neighbor], 2)}).",
                            data_snapshot = {
                                "distances": dist_display(),
                                "f_scores": {n: round(f_scores[n], 2) if f_scores[n] != math.inf else "inf" for n in node_ids},
                                "open_set_size": len(heap),
                                "visited": sorted(visited),
                                "current_neighbors": [nb for nb, _ in adj[current]],
                                "heuristic_value": round(h_scores[neighbor], 2),
                            },
                        ),
                        pseudocode_lines = [8, 9, 10, 11, 12, 13],
                    )
                else:
                    add_step(
                        "NO_RELAX",
                        [
                            HighlightedEntity(id = current, state = node_states[current], label = current),
                            HighlightedEntity(id = neighbor, state = node_states[neighbor], label = neighbor),
                        ],
                        eb.build(
                            title = f"No improvement for '{neighbor}'",
                            body = f"Edge {current} -> {neighbor} (w={weight}): g[{neighbor}]={round(g_scores[neighbor], 2)} <= {round(new_g, 2)}.",
                            data_snapshot = {
                                "distances": dist_display(),
                                "visited": sorted(visited),
                            },
                        ),
                        pseudocode_lines = [8, 9, 10],
                    )

            if node_states[current] not in ("source", "target", "success"):
                node_states[current] = "visited"

        # complete
        if not path_found:
            result_message = f"No path found to '{target}'." if target else "All reachable nodes finalized."
            add_step(
                "COMPLETE",
                [],
                eb.build(
                    title = "A* complete",
                    body = f"Finalized {metrics['nodes_visited']} node(s), explored {metrics['edges_explored']} edge(s). {result_message}",
                    data_snapshot = {
                        "distances": dist_display(),
                        "visited": sorted(visited),
                    },
                ),
                pseudocode_lines = [14],
            )

        final_result = {
            "path_found": path_found,
            "path": final_path or [],
            "path_cost": round(g_scores[target], 2) if target and path_found else None,
            "nodes_visited": metrics["nodes_visited"],
            "distances": dist_display(),
        }

        alg_metadata = self.build_metadata(algo_input) | {
            "time_complexity": "O((V + E) log V)",
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
