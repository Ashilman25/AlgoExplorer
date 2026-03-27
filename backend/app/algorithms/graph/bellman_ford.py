import math

from pydantic import ValidationError

from app.simulation.contract import BaseAlgorithm
from app.simulation.registry import register
from app.simulation.types import AlgorithmInput, AlgorithmOutput
from app.schemas.timeline import TimelineStep, HighlightedEntity
from app.schemas.payloads import GraphInputPayload
from app.exceptions import DomainError


@register("graph", "bellman_ford")
class BellmanFordAlgorithm(BaseAlgorithm):
    @property
    def module_type(self) -> str:
        return "graph"

    @property
    def algorithm_key(self) -> str:
        return "bellman_ford"

    def run(self, algo_input: AlgorithmInput) -> AlgorithmOutput:
        explain = algo_input.explanation_level

        try:
            graph_input = GraphInputPayload.model_validate(algo_input.input_payload)
        except ValidationError as e:
            raise DomainError("Invalid graph input.", details = {"errors": e.errors()})

        node_ids: list[str] = [str(n.id) for n in graph_input.nodes]
        source: str = str(graph_input.source)
        target: str | None = str(graph_input.target) if graph_input.target is not None else None
        directed: bool = graph_input.directed

        if source not in node_ids:
            raise DomainError(f"Source node '{source}' not found in node list")
        if target and target not in node_ids:
            raise DomainError(f"Target node '{target}' not found in node list")

        # build edge list
        all_edges: list[tuple[str, str, float]] = []
        for e in graph_input.edges:
            u, v = str(e.source), str(e.target)
            w = e.weight if e.weight is not None else 1.0
            all_edges.append((u, v, w))
            if not directed:
                all_edges.append((v, u, w))

        # simulation state
        node_states: dict[str, str] = {n: "default" for n in node_ids}
        edge_states: dict[str, str] = {}
        dist: dict[str, float] = {n: math.inf for n in node_ids}
        parent: dict[str, str | None] = {n: None for n in node_ids}

        steps: list[TimelineStep] = []
        metrics = {
            "edges_processed": 0,
            "relaxation_count": 0,
            "passes_completed": 0,
        }

        def ek(a: str, b: str) -> str:
            return f"{a}-{b}"

        def dist_display() -> dict[str, float | str]:
            result = {}
            for n, d in dist.items():
                result[n] = round(d, 2) if d != math.inf else "inf"
            return result

        def add_step(event_type: str, highlighted: list[HighlightedEntity], explanation: str, path: list[str] | None = None, negative_cycle: list[str] | None = None) -> None:
            s_payload = {
                "node_states": dict(node_states),
                "edge_states": dict(edge_states),
                "frontier": [],
                "distances": dist_display(),
                "path": list(path) if path else None,
                "negative_cycle": negative_cycle,
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
        dist[source] = 0
        node_states[source] = "source"
        if target:
            node_states[target] = "target"

        V = len(node_ids)
        add_step(
            "INITIALIZE",
            [HighlightedEntity(id = source, state = "source", label = source)],
            f"Initialize Bellman-Ford from '{source}'. "
            f"Set dist[{source}] = 0, all others = inf. "
            f"Will perform {V - 1} relaxation pass(es) over {len(all_edges)} edge(s).",
        )

        # V-1 relaxation passes
        for pass_num in range(1, V):
            metrics["passes_completed"] += 1
            add_step(
                "START_PASS",
                [],
                f"Pass {pass_num}/{V - 1}: Relaxing all {len(all_edges)} edges.",
            )

            for u, v, w in all_edges:
                metrics["edges_processed"] += 1

                if dist[u] == math.inf:
                    continue

                new_dist = dist[u] + w

                if new_dist < dist[v]:
                    old_dist = dist[v]
                    dist[v] = new_dist
                    parent[v] = u
                    metrics["relaxation_count"] += 1

                    edge_states[ek(u, v)] = "frontier"
                    if node_states[v] not in ("source", "target"):
                        node_states[v] = "frontier"

                    old_label = "inf" if old_dist == math.inf else str(round(old_dist, 2))
                    add_step(
                        "RELAX",
                        [
                            HighlightedEntity(id = u, state = node_states[u], label = u),
                            HighlightedEntity(id = v, state = node_states[v], label = v),
                        ],
                        f"Edge {u} -> {v} (w={w}): "
                        f"Relax dist[{v}] from {old_label} to {round(new_dist, 2)}.",
                    )
                else:
                    add_step(
                        "NO_RELAX",
                        [
                            HighlightedEntity(id = u, state = node_states[u], label = u),
                            HighlightedEntity(id = v, state = node_states[v], label = v),
                        ],
                        f"Edge {u} -> {v} (w={w}): "
                        f"dist[{v}] = {round(dist[v], 2)} <= {round(new_dist, 2)}. No improvement.",
                    )

        # negative cycle detection (V-th pass)
        negative_cycle_detected = False
        cycle_nodes: list[str] = []

        add_step(
            "START_PASS",
            [],
            f"Detection pass: checking for negative cycles. "
            f"If any edge can still be relaxed, a negative cycle exists.",
        )

        for u, v, w in all_edges:
            metrics["edges_processed"] += 1
            if dist[u] != math.inf and dist[u] + w < dist[v]:
                negative_cycle_detected = True
                # trace the cycle
                visited_trace: set[str] = set()
                node = v
                while node not in visited_trace:
                    visited_trace.add(node)
                    node = parent[node]
                cycle_start = node
                cycle_nodes = [cycle_start]
                node = parent[cycle_start]
                while node != cycle_start:
                    cycle_nodes.append(node)
                    node = parent[node]
                cycle_nodes.append(cycle_start)
                cycle_nodes.reverse()

                # mark cycle nodes/edges with error state
                for cn in cycle_nodes:
                    node_states[cn] = "target"  # rose-400 (error/target)
                for i in range(len(cycle_nodes) - 1):
                    edge_states[ek(cycle_nodes[i], cycle_nodes[i + 1])] = "target"

                cycle_str = " -> ".join(cycle_nodes)
                highlighted_cycle = [HighlightedEntity(id = n, state = "target", label = n) for n in cycle_nodes]
                add_step(
                    "NEGATIVE_CYCLE_DETECTED",
                    highlighted_cycle,
                    f"Negative cycle detected! Cycle: {cycle_str}. "
                    f"Shortest paths are undefined when a negative cycle is reachable.",
                    negative_cycle = cycle_nodes,
                )
                break

        # path reconstruction (only if no negative cycle)
        path_found = False
        final_path: list[str] | None = None

        if not negative_cycle_detected and target and dist[target] != math.inf:
            path: list[str] = []
            node = target
            while node is not None:
                path.append(node)
                node = parent[node]
            path.reverse()
            final_path = path
            path_found = True

            for p in path:
                node_states[p] = "success"
            for i in range(len(path) - 1):
                edge_states[ek(path[i], path[i + 1])] = "success"

            path_string = " -> ".join(path)
            highlighted_path = [HighlightedEntity(id = n, state = "success", label = n) for n in path]
            add_step(
                "PATH_FOUND",
                highlighted_path,
                f"Shortest path to '{target}': {path_string} (cost {round(dist[target], 2)}). "
                f"Bellman-Ford handles negative edge weights correctly.",
                path = path,
            )

        elif not negative_cycle_detected:
            result_message = f"No path found to '{target}'." if target else "All reachable nodes finalized."
            add_step(
                "COMPLETE",
                [],
                f"Bellman-Ford complete. "
                f"Processed {metrics['edges_processed']} edge checks, "
                f"{metrics['relaxation_count']} relaxation(s) over {metrics['passes_completed']} pass(es). "
                f"{result_message}",
            )

        final_result = {
            "path_found": path_found,
            "path": final_path or [],
            "path_cost": round(dist[target], 2) if target and path_found else None,
            "negative_cycle_detected": negative_cycle_detected,
            "cycle_nodes": cycle_nodes if negative_cycle_detected else [],
            "nodes_visited": len([n for n in node_ids if dist[n] != math.inf]),
            "distances": dist_display(),
        }

        alg_metadata = self.build_metadata(algo_input) | {
            "time_complexity": "O(V * E)",
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
