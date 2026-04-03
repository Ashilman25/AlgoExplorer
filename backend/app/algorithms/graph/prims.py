import heapq

from pydantic import ValidationError

from app.simulation.contract import BaseAlgorithm
from app.simulation.registry import register
from app.simulation.types import AlgorithmInput, AlgorithmOutput
from app.schemas.timeline import TimelineStep, HighlightedEntity
from app.schemas.payloads import GraphInputPayload
from app.exceptions import DomainError
from app.simulation.explanation_builder import ExplanationBuilder
from app.benchmark.graph_inputs import parse_benchmark_graph


@register("graph", "prims")
class PrimsAlgorithm(BaseAlgorithm):
    @property
    def module_type(self) -> str:
        return "graph"

    @property
    def algorithm_key(self) -> str:
        return "prims"

    def run(self, algo_input: AlgorithmInput) -> AlgorithmOutput:
        # ── benchmark fast path ─────────────────────────────
        if algo_input.execution_mode == "benchmark":
            bg = parse_benchmark_graph(algo_input.input_payload)

            adj: dict[str, list[tuple[str, float]]] = {n: [] for n in bg.node_ids}
            for u, v, w in bg.edges:
                adj[u].append((v, w))
                adj[v].append((u, w))

            source = bg.source
            in_tree: set[str] = {source}
            counter = 0
            heap: list[tuple[float, int, str, str]] = []
            mst_total_weight = 0.0
            edges_added = 0
            metrics = {"nodes_in_tree": 1, "edges_added": 0, "mst_total_weight": 0, "heap_max_size": 0}

            for neighbor, weight in adj[source]:
                counter += 1
                heapq.heappush(heap, (weight, counter, source, neighbor))
            if len(heap) > metrics["heap_max_size"]:
                metrics["heap_max_size"] = len(heap)

            while heap:
                weight, _, from_node, to_node = heapq.heappop(heap)
                if to_node in in_tree:
                    continue

                in_tree.add(to_node)
                mst_total_weight += weight
                edges_added += 1
                metrics["nodes_in_tree"] = len(in_tree)
                metrics["edges_added"] = edges_added
                metrics["mst_total_weight"] = mst_total_weight

                for neighbor, w in adj[to_node]:
                    if neighbor not in in_tree:
                        counter += 1
                        heapq.heappush(heap, (w, counter, to_node, neighbor))
                        if len(heap) > metrics["heap_max_size"]:
                            metrics["heap_max_size"] = len(heap)

            return AlgorithmOutput(
                timeline_steps = [],
                final_result = {"mst_edges": [], "total_weight": mst_total_weight, "nodes_in_tree": len(in_tree)},
                summary_metrics = metrics,
                algorithm_metadata = self.build_metadata(algo_input),
            )

        eb = ExplanationBuilder(algo_input.explanation_level)

        try:
            graph_input = GraphInputPayload.model_validate(algo_input.input_payload)
        except ValidationError as e:
            raise DomainError("Invalid graph input.", details = {"errors": e.errors()})

        node_ids: list[str] = [str(n.id) for n in graph_input.nodes]

        if graph_input.source is None:
            raise DomainError("Prim's algorithm requires a source node.")

        source: str = str(graph_input.source)

        if source not in node_ids:
            raise DomainError(f"Source node '{source}' not found in node list")

        # adjacency list (always undirected for MST)
        adj: dict[str, list[tuple[str, float]]] = {n: [] for n in node_ids}
        for e in graph_input.edges:
            u, v = str(e.source), str(e.target)
            w = e.weight if e.weight is not None else 1.0
            adj[u].append((v, w))
            adj[v].append((u, w))

        # simulation state
        node_states: dict[str, str] = {n: "default" for n in node_ids}
        edge_states: dict[str, str] = {}
        mst_edges: list[dict] = []
        mst_total_weight: float = 0

        steps: list[TimelineStep] = []
        metrics = {
            "nodes_in_tree": 0,
            "edges_added": 0,
            "mst_total_weight": 0,
            "heap_max_size": 0,
        }

        def ek(a: str, b: str) -> str:
            return f"{a}-{b}"

        def add_step(event_type: str, highlighted: list[HighlightedEntity], explanation: str, pseudocode_lines: list[int] | None = None) -> None:
            if algo_input.execution_mode == "benchmark":
                return
            s_payload = {
                "node_states": dict(node_states),
                "edge_states": dict(edge_states),
                "frontier": [],
                "distances": None,
                "path": None,
                "mst_edges": [dict(e) for e in mst_edges],
                "mst_total_weight": mst_total_weight,
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
        in_tree: set[str] = {source}
        node_states[source] = "source"
        metrics["nodes_in_tree"] = 1

        add_step(
            "INITIALIZE",
            [HighlightedEntity(id = source, state = "source", label = source)],
            eb.build(
                title = f"Initialize Prim's MST from '{source}'",
                body = f"Add '{source}' to the tree. Push its {len(adj[source])} edge(s) to the heap.",
                data_snapshot = {
                    "mst_edges": [],
                    "mst_cost": 0,
                    "priority_queue_size": 0,
                    "visited": sorted(in_tree),
                },
            ),
            pseudocode_lines = [0, 1, 2, 3, 4],
        )

        # push initial edges
        counter = 0
        heap: list[tuple[float, int, str, str]] = []  # (weight, counter, from_node, to_node)
        for neighbor, weight in adj[source]:
            counter += 1
            heapq.heappush(heap, (weight, counter, source, neighbor))
            edge_states[ek(source, neighbor)] = "frontier"
            edge_states[ek(neighbor, source)] = "frontier"
            if node_states[neighbor] != "source":
                node_states[neighbor] = "frontier"

        if len(heap) > metrics["heap_max_size"]:
            metrics["heap_max_size"] = len(heap)

        # main loop
        while heap:
            weight, _, from_node, to_node = heapq.heappop(heap)

            if to_node in in_tree:
                add_step(
                    "SKIP_EDGE",
                    [
                        HighlightedEntity(id = from_node, state = node_states[from_node], label = from_node),
                        HighlightedEntity(id = to_node, state = node_states[to_node], label = to_node),
                    ],
                    eb.build(
                        title = f"Skip edge {from_node}-{to_node}",
                        body = f"Edge {from_node}-{to_node} (w={weight}): '{to_node}' already in MST.",
                        data_snapshot = {
                            "mst_edges": [[e["source"], e["target"], e["weight"]] for e in mst_edges],
                            "mst_cost": mst_total_weight,
                            "priority_queue_size": len(heap),
                            "visited": sorted(in_tree),
                        },
                    ),
                    pseudocode_lines = [5, 6, 9],
                )
                continue

            add_step(
                "POP_MIN_EDGE",
                [
                    HighlightedEntity(id = from_node, state = node_states[from_node], label = from_node),
                    HighlightedEntity(id = to_node, state = "active", label = to_node),
                ],
                eb.build(
                    title = f"Pop edge {from_node}-{to_node} (w={weight})",
                    body = f"Cheapest cross-edge connects '{to_node}' to the MST.",
                    data_snapshot = {
                        "mst_edges": [[e["source"], e["target"], e["weight"]] for e in mst_edges],
                        "mst_cost": mst_total_weight,
                        "priority_queue_size": len(heap),
                        "visited": sorted(in_tree),
                    },
                ),
                pseudocode_lines = [5, 6],
            )

            # add to MST
            in_tree.add(to_node)
            mst_edges.append({"source": from_node, "target": to_node, "weight": weight})
            mst_total_weight += weight
            metrics["nodes_in_tree"] = len(in_tree)
            metrics["edges_added"] = len(mst_edges)
            metrics["mst_total_weight"] = mst_total_weight

            node_states[to_node] = "visited"
            edge_states[ek(from_node, to_node)] = "success"
            edge_states[ek(to_node, from_node)] = "success"

            add_step(
                "ADD_TO_MST",
                [
                    HighlightedEntity(id = to_node, state = "success", label = to_node),
                ],
                eb.build(
                    title = f"Add edge {from_node}-{to_node} to MST",
                    body = f"MST cost is now {mst_total_weight}. Tree has {len(in_tree)} node(s), {len(mst_edges)} edge(s).",
                    data_snapshot = {
                        "mst_edges": [[e["source"], e["target"], e["weight"]] for e in mst_edges],
                        "mst_cost": mst_total_weight,
                        "priority_queue_size": len(heap),
                        "visited": sorted(in_tree),
                    },
                ),
                pseudocode_lines = [7, 8, 9, 10, 11],
            )

            # push new edges from to_node
            for neighbor, w in adj[to_node]:
                if neighbor not in in_tree:
                    counter += 1
                    heapq.heappush(heap, (w, counter, to_node, neighbor))
                    if len(heap) > metrics["heap_max_size"]:
                        metrics["heap_max_size"] = len(heap)
                    edge_states[ek(to_node, neighbor)] = "frontier"
                    edge_states[ek(neighbor, to_node)] = "frontier"
                    if node_states[neighbor] not in ("visited", "source"):
                        node_states[neighbor] = "frontier"

        # complete
        add_step(
            "COMPLETE",
            [],
            eb.build(
                title = "Prim's complete",
                body = f"MST has {len(mst_edges)} edge(s), total weight {mst_total_weight}, spanning {len(in_tree)} of {len(node_ids)} node(s).",
                data_snapshot = {
                    "mst_edges": [[e["source"], e["target"], e["weight"]] for e in mst_edges],
                    "mst_cost": mst_total_weight,
                    "priority_queue_size": 0,
                    "visited": sorted(in_tree),
                },
            ),
            pseudocode_lines = [12],
        )

        final_result = {
            "mst_edges": [dict(e) for e in mst_edges],
            "total_weight": mst_total_weight,
            "nodes_in_tree": len(in_tree),
        }

        alg_metadata = self.build_metadata(algo_input) | {
            "time_complexity": "O((V + E) log V)",
            "space_complexity": "O(V + E)",
            "weighted": graph_input.weighted,
            "directed": graph_input.directed,
        }

        return AlgorithmOutput(
            timeline_steps = steps,
            final_result = final_result,
            summary_metrics = metrics,
            algorithm_metadata = alg_metadata,
        )
