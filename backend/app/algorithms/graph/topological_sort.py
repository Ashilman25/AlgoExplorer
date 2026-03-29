from collections import deque

from pydantic import ValidationError

from app.simulation.contract import BaseAlgorithm
from app.simulation.registry import register
from app.simulation.types import AlgorithmInput, AlgorithmOutput
from app.schemas.timeline import TimelineStep, HighlightedEntity
from app.schemas.payloads import GraphInputPayload
from app.exceptions import DomainError
from app.simulation.explanation_builder import ExplanationBuilder


@register("graph", "topological_sort")
class TopologicalSortAlgorithm(BaseAlgorithm):
    @property
    def module_type(self) -> str:
        return "graph"

    @property
    def algorithm_key(self) -> str:
        return "topological_sort"

    def run(self, algo_input: AlgorithmInput) -> AlgorithmOutput:
        eb = ExplanationBuilder(algo_input.explanation_level)

        try:
            graph_input = GraphInputPayload.model_validate(algo_input.input_payload)
        except ValidationError as e:
            raise DomainError("Invalid graph input.", details = {"errors": e.errors()})

        if not graph_input.directed:
            raise DomainError("Topological Sort requires a directed graph.")

        node_ids: list[str] = [str(n.id) for n in graph_input.nodes]

        # adjacency list + in-degree
        adj: dict[str, list[str]] = {n: [] for n in node_ids}
        in_degree: dict[str, int] = {n: 0 for n in node_ids}
        for e in graph_input.edges:
            u, v = str(e.source), str(e.target)
            adj[u].append(v)
            in_degree[v] += 1

        # simulation state
        node_states: dict[str, str] = {n: "default" for n in node_ids}
        edge_states: dict[str, str] = {}
        ordering: list[str] = []

        steps: list[TimelineStep] = []
        metrics = {
            "nodes_ordered": 0,
            "edges_processed": 0,
            "in_degree_updates": 0,
        }

        def ek(a: str, b: str) -> str:
            return f"{a}-{b}"

        def add_step(event_type: str, highlighted: list[HighlightedEntity], explanation: str, cycle_detected: bool = False, cycle_nodes: list[str] | None = None, pseudocode_lines: list[int] | None = None) -> None:
            s_payload = {
                "node_states": dict(node_states),
                "edge_states": dict(edge_states),
                "frontier": [],
                "distances": None,
                "path": None,
                "ordering": list(ordering),
                "cycle_detected": cycle_detected,
                "cycle_nodes": cycle_nodes or [],
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
        zero_in = [n for n in node_ids if in_degree[n] == 0]
        degree_summary = ", ".join(f"{n}={in_degree[n]}" for n in node_ids)
        add_step(
            "INITIALIZE",
            [],
            eb.build(
                title = "Initialize Kahn's algorithm",
                body = f"In-degrees: {degree_summary}. {len(zero_in)} node(s) with in-degree 0.",
                data_snapshot = {
                    "result_stack": list(ordering),
                    "visited": [],
                    "in_progress": [],
                },
            ),
            pseudocode_lines = [0, 1, 2, 3],
        )

        # enqueue zero in-degree nodes
        queue: deque[str] = deque()
        for n in zero_in:
            queue.append(n)
            node_states[n] = "frontier"
            add_step(
                "ENQUEUE_ZERO",
                [HighlightedEntity(id = n, state = "frontier", label = n)],
                eb.build(
                    title = f"Enqueue '{n}'",
                    body = f"In-degree = 0. Ready for processing.",
                    data_snapshot = {
                        "result_stack": list(ordering),
                        "visited": sorted([nd for nd in node_ids if node_states[nd] == "success"]),
                        "in_progress": sorted(queue),
                    },
                ),
                pseudocode_lines = [2],
            )

        # main loop
        while queue:
            current = queue.popleft()
            ordering.append(current)
            metrics["nodes_ordered"] += 1

            node_states[current] = "active"
            add_step(
                "DEQUEUE",
                [HighlightedEntity(id = current, state = "active", label = current)],
                eb.build(
                    title = f"Dequeue '{current}'",
                    body = f"Add to ordering at position {len(ordering)}. {len(adj[current])} outgoing edge(s) to process.",
                    data_snapshot = {
                        "result_stack": list(ordering),
                        "visited": sorted([n for n in node_ids if node_states[n] == "success"]),
                        "in_progress": sorted(queue),
                    },
                ),
                pseudocode_lines = [4, 5, 6],
            )

            for neighbor in adj[current]:
                metrics["edges_processed"] += 1
                in_degree[neighbor] -= 1
                metrics["in_degree_updates"] += 1

                edge_states[ek(current, neighbor)] = "visited"

                add_step(
                    "DECREMENT_INDEGREE",
                    [
                        HighlightedEntity(id = current, state = "active", label = current),
                        HighlightedEntity(id = neighbor, state = node_states[neighbor], label = neighbor),
                    ],
                    eb.build(
                        title = f"Decrement in-degree of '{neighbor}'",
                        body = f"Edge {current} -> {neighbor}: in-degree is now {in_degree[neighbor]}.",
                        data_snapshot = {
                            "result_stack": list(ordering),
                            "visited": sorted([n for n in node_ids if node_states[n] == "success"]),
                            "in_progress": sorted(queue),
                        },
                    ),
                    pseudocode_lines = [7, 8],
                )

                if in_degree[neighbor] == 0:
                    queue.append(neighbor)
                    if node_states[neighbor] == "default":
                        node_states[neighbor] = "frontier"
                    add_step(
                        "ENQUEUE_ZERO",
                        [HighlightedEntity(id = neighbor, state = "frontier", label = neighbor)],
                        eb.build(
                            title = f"Enqueue '{neighbor}'",
                            body = f"In-degree reached 0. Ready for processing.",
                            data_snapshot = {
                                "result_stack": list(ordering),
                                "visited": sorted([n for n in node_ids if node_states[n] == "success"]),
                                "in_progress": sorted(queue),
                            },
                        ),
                        pseudocode_lines = [9],
                    )

            node_states[current] = "success"

        # check for cycle
        cycle_detected = len(ordering) < len(node_ids)

        if cycle_detected:
            cycle_nodes = [n for n in node_ids if n not in set(ordering)]
            for cn in cycle_nodes:
                node_states[cn] = "target"  # rose-400 (error)

            add_step(
                "CYCLE_DETECTED",
                [HighlightedEntity(id = n, state = "target", label = n) for n in cycle_nodes],
                eb.build(
                    title = "Cycle detected",
                    body = f"Only {len(ordering)} of {len(node_ids)} nodes ordered. Remaining nodes form a cycle: {', '.join(cycle_nodes)}.",
                    data_snapshot = {
                        "result_stack": list(ordering),
                        "visited": sorted([n for n in node_ids if node_states[n] == "success"]),
                        "in_progress": [],
                    },
                ),
                cycle_detected = True,
                cycle_nodes = cycle_nodes,
                pseudocode_lines = [10],
            )
        else:
            ordering_str = " -> ".join(ordering)
            add_step(
                "COMPLETE",
                [],
                eb.build(
                    title = "Topological sort complete",
                    body = f"Ordering: {ordering_str}. {metrics['edges_processed']} edge(s), {metrics['in_degree_updates']} in-degree update(s).",
                    data_snapshot = {
                        "result_stack": list(ordering),
                        "visited": sorted(ordering),
                        "in_progress": [],
                    },
                ),
                pseudocode_lines = [11],
            )

        final_result = {
            "ordering": list(ordering),
            "cycle_detected": cycle_detected,
            "nodes_ordered": len(ordering),
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
