from pydantic import ValidationError

from app.simulation.contract import BaseAlgorithm
from app.simulation.registry import register
from app.simulation.types import AlgorithmInput, AlgorithmOutput
from app.schemas.timeline import TimelineStep, HighlightedEntity
from app.schemas.payloads import GraphInputPayload
from app.exceptions import DomainError


class UnionFind:
    def __init__(self, elements: list[str]):
        self.parent: dict[str, str] = {e: e for e in elements}
        self.rank: dict[str, int] = {e: 0 for e in elements}
        self.num_components = len(elements)

    def find(self, x: str) -> str:
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]  # path compression
            x = self.parent[x]
        return x

    def union(self, x: str, y: str) -> bool:
        rx, ry = self.find(x), self.find(y)
        if rx == ry:
            return False
        if self.rank[rx] < self.rank[ry]:
            rx, ry = ry, rx
        self.parent[ry] = rx
        if self.rank[rx] == self.rank[ry]:
            self.rank[rx] += 1
        self.num_components -= 1
        return True


@register("graph", "kruskals")
class KruskalsAlgorithm(BaseAlgorithm):
    @property
    def module_type(self) -> str:
        return "graph"

    @property
    def algorithm_key(self) -> str:
        return "kruskals"

    def run(self, algo_input: AlgorithmInput) -> AlgorithmOutput:
        explain = algo_input.explanation_level

        try:
            graph_input = GraphInputPayload.model_validate(algo_input.input_payload)
        except ValidationError as e:
            raise DomainError("Invalid graph input.", details = {"errors": e.errors()})

        node_ids: list[str] = [str(n.id) for n in graph_input.nodes]

        # build and sort edge list (deduplicate for undirected)
        seen_edges: set[tuple[str, str]] = set()
        sorted_edges: list[tuple[float, str, str]] = []
        for e in graph_input.edges:
            u, v = str(e.source), str(e.target)
            w = e.weight if e.weight is not None else 1.0
            edge_key = (min(u, v), max(u, v))
            if edge_key not in seen_edges:
                seen_edges.add(edge_key)
                sorted_edges.append((w, u, v))
        sorted_edges.sort()

        # simulation state
        node_states: dict[str, str] = {n: "default" for n in node_ids}
        edge_states: dict[str, str] = {}
        mst_edges: list[dict] = []
        mst_total_weight: float = 0
        uf = UnionFind(node_ids)

        steps: list[TimelineStep] = []
        metrics = {
            "edges_considered": 0,
            "edges_added": 0,
            "components_remaining": len(node_ids),
            "mst_total_weight": 0,
        }

        def ek(a: str, b: str) -> str:
            return f"{a}-{b}"

        def add_step(event_type: str, highlighted: list[HighlightedEntity], explanation: str, pseudocode_lines: list[int] | None = None) -> None:
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
                explanation = explanation if explain != "none" else None,
                timestamp_or_order = len(steps),
            )
            steps.append(step)

        # initialize
        add_step(
            "INITIALIZE",
            [],
            f"Initialize Kruskal's MST. "
            f"{len(sorted_edges)} edge(s) sorted by weight. "
            f"{len(node_ids)} component(s) initially.",
            pseudocode_lines = [0, 1, 2, 3],
        )

        # process edges
        for weight, u, v in sorted_edges:
            metrics["edges_considered"] += 1

            edge_states[ek(u, v)] = "active"
            edge_states[ek(v, u)] = "active"
            if node_states[u] == "default":
                node_states[u] = "active"
            if node_states[v] == "default":
                node_states[v] = "active"

            add_step(
                "CONSIDER_EDGE",
                [
                    HighlightedEntity(id = u, state = node_states[u], label = u),
                    HighlightedEntity(id = v, state = node_states[v], label = v),
                ],
                f"Consider edge {u} - {v} (w={weight}). "
                f"Check if adding it creates a cycle.",
                pseudocode_lines = [4, 5],
            )

            if uf.union(u, v):
                # accepted
                mst_edges.append({"source": u, "target": v, "weight": weight})
                mst_total_weight += weight
                metrics["edges_added"] = len(mst_edges)
                metrics["components_remaining"] = uf.num_components
                metrics["mst_total_weight"] = mst_total_weight

                edge_states[ek(u, v)] = "success"
                edge_states[ek(v, u)] = "success"
                node_states[u] = "visited"
                node_states[v] = "visited"

                add_step(
                    "ADD_TO_MST",
                    [
                        HighlightedEntity(id = u, state = "success", label = u),
                        HighlightedEntity(id = v, state = "success", label = v),
                    ],
                    f"Accept edge {u} - {v} (w={weight}). "
                    f"No cycle formed. MST weight: {mst_total_weight}. "
                    f"{uf.num_components} component(s) remaining.",
                    pseudocode_lines = [5, 6, 7, 8],
                )
            else:
                # rejected
                edge_states[ek(u, v)] = "default"
                edge_states[ek(v, u)] = "default"

                add_step(
                    "REJECT_CYCLE_EDGE",
                    [
                        HighlightedEntity(id = u, state = node_states[u], label = u),
                        HighlightedEntity(id = v, state = node_states[v], label = v),
                    ],
                    f"Reject edge {u} - {v} (w={weight}). "
                    f"Would create a cycle (both in same component).",
                    pseudocode_lines = [5],
                )

            # early exit: full spanning tree found (connected graph only;
            # for disconnected graphs this never triggers — all edges are processed)
            if len(mst_edges) == len(node_ids) - 1:
                break

        # complete
        add_step(
            "COMPLETE",
            [],
            f"Kruskal's complete. MST has {len(mst_edges)} edge(s), "
            f"total weight {mst_total_weight}. "
            f"Considered {metrics['edges_considered']} of {len(sorted_edges)} edge(s). "
            f"{uf.num_components} component(s) in final forest.",
            pseudocode_lines = [9],
        )

        final_result = {
            "mst_edges": [dict(e) for e in mst_edges],
            "total_weight": mst_total_weight,
            "nodes_in_tree": len(mst_edges) + uf.num_components,
        }

        alg_metadata = self.build_metadata(algo_input) | {
            "time_complexity": "O(E log E)",
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
