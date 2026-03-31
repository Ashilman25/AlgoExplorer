from collections import deque

from pydantic import ValidationError

from app.simulation.contract import BaseAlgorithm
from app.simulation.registry import register
from app.simulation.types import AlgorithmInput, AlgorithmOutput
from app.schemas.timeline import TimelineStep, HighlightedEntity
from app.schemas.payloads import GraphInputPayload
from app.exceptions import DomainError
from app.simulation.explanation_builder import ExplanationBuilder

@register("graph", "bfs")
class BFSAlgorithm(BaseAlgorithm):
    @property
    def module_type(self) -> str:
        return "graph"
    
    @property
    def algorithm_key(self):
        return "bfs"
    
    
    def run(self, algo_input: AlgorithmInput) -> AlgorithmOutput:
        eb = ExplanationBuilder(algo_input.explanation_level)

        # payload parse + validation
        try:
            graph_input = GraphInputPayload.model_validate(algo_input.input_payload)
            
        except ValidationError as e:
            raise DomainError("Invalid graph input.", details = {"errors": e.errors()})

        node_ids: list[str] = []
        for n in graph_input.nodes:
            node_ids.append(str(n.id))
        
        source: str = str(graph_input.source)
        target: str | None = str(graph_input.target) if graph_input.target is not None else None

        if source not in node_ids:
            raise DomainError(f"Source node '{source}' not found in node list")

        if target and target not in node_ids:
            raise DomainError(f"Target node '{target}' not found in node list")

        #adjacency list
        adj: dict[str, list[str]] = {}
        for n in node_ids:
            adj[n] = []
                    
        for e in graph_input.edges:
            u = str(e.source)
            v = str(e.target)
            
            adj[u].append(v)
            
            if not graph_input.directed:
                adj[v].append(u)
            
        
        # ── benchmark fast path ─────────────────────────────
        if algo_input.execution_mode == "benchmark":
            queue: deque[str] = deque([source])
            visited: set[str] = {source}
            metrics = {"nodes_visited": 0, "edges_explored": 0, "frontier_size": 1}

            while queue:
                current = queue.popleft()
                metrics["frontier_size"] = len(queue)
                metrics["nodes_visited"] += 1

                if target and current == target:
                    break

                for neighbor in adj[current]:
                    metrics["edges_explored"] += 1
                    if neighbor not in visited:
                        visited.add(neighbor)
                        queue.append(neighbor)
                        metrics["frontier_size"] = len(queue)

            return AlgorithmOutput(
                timeline_steps = [],
                final_result = {"path_found": target is not None and current == target, "path": [], "nodes_visited": metrics["nodes_visited"]},
                summary_metrics = metrics,
                algorithm_metadata = self.build_metadata(algo_input),
            )

        #simulation state
        node_states: dict[str, str] = {}
        for n in node_ids:
            node_states[n] = "default"
            
        edge_states: dict[str, str] = {}
        steps: list[TimelineStep] = []
        metrics = {
            "nodes_visited" : 0,
            "edges_explored" : 0,
            "frontier_size" : 0
        }
        
        
        def ek(a: str, b: str) -> str:
            return f"{a}-{b}"
        
        
        def add_step(event_type: str, highlighted: list[HighlightedEntity], explanation: str, frontier: list[str] | None = None, path: list[str] | None = None, pseudocode_lines: list[int] | None = None) -> None:
            if algo_input.execution_mode == "benchmark":
                return
            s_payload = {
                "node_states" : dict(node_states),
                "edge_states" : dict(edge_states),
                "frontier" : list(frontier) if frontier is not None else [],
                "distances" : None,
                "path" : list(path) if path else None,
                "pseudocode_lines" : pseudocode_lines or [],
            }
            
            step = TimelineStep(
                step_index = len(steps),
                event_type = event_type,
                state_payload = s_payload,
                highlighted_entities = highlighted,
                metrics_snapshot = dict(metrics),
                explanation = explanation,
                timestamp_or_order = len(steps)
            )
            
            steps.append(step)
            
            
            
        #initialization
        node_states[source] = "source"
        if target:
            node_states[target] = "target"
            
        queue: deque[str] = deque([source])
        visited: set[str] = {source}
        parent: dict[str, str] = {}
        metrics["frontier_size"] = 1
        
        initial_highlight = [HighlightedEntity(id = source, state = "source", label = source)]
        
        if target:
            target_message = f"Searching for target '{target}'"
        else:
            target_message = "Visiting all reachable nodes."
            
        add_step(
            "INITIALIZE",
            initial_highlight,
            eb.build(
                title = f"Initialize BFS from '{source}'",
                body = f"Set '{source}' as visited and enqueue it. {target_message}",
                data_snapshot = {
                    "queue": list(queue),
                    "visited": sorted(visited),
                },
            ),
            frontier = list(queue),
            pseudocode_lines = [0, 1, 2, 3, 4],
        )
        
        path_found = False
        final_path: list[str] | None = None
        
        
        # main bfs loop
        while queue:
            current = queue.popleft()
            metrics["frontier_size"] = len(queue)
            metrics["nodes_visited"] += 1
            
            if node_states[current] not in ("source", "target"):
                node_states[current] = "active"
                
                
            # add step info
            neighbors_count = len(adj[current])
            visited_count = metrics["nodes_visited"]
            
            explanation = eb.build(
                title = f"Dequeue '{current}'",
                body = f"Exploring {neighbors_count} neighbor(s). {visited_count} node(s) visited so far.",
                data_snapshot = {
                    "queue": list(queue),
                    "visited": sorted(visited),
                    "current_neighbors": list(adj[current]),
                },
            )

            highlight = [
                HighlightedEntity(
                    id = current,
                    state = node_states[current],
                    label = current
                )
            ]

            add_step("DEQUEUE", highlight, explanation, frontier = list(queue), pseudocode_lines = [5, 6])
            
            
            #target check
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
                    
                    
                #add step info
                highlighted_path = []
                for n in path:
                    highlighted_path.append(HighlightedEntity(id = n, state = "success", label = n))
                    
                path_string = " → ".join(path)
                hops = len(path) - 1
                
                explanation = eb.build(
                    title = f"Target '{target}' found",
                    body = f"Shortest path: {path_string} ({hops} hop(s)). BFS guarantees shortest path in unweighted graphs.",
                    data_snapshot = {
                        "path": path,
                        "visited": sorted(visited),
                        "total_edges_explored": metrics["edges_explored"],
                    },
                )

                add_step("PATH_FOUND", highlighted_path, explanation, frontier = list(queue), path = path, pseudocode_lines = [7, 8])
                path_found = True
                break
            
            
            
            # explore neighbors
            for neighbor in adj[current]:
                metrics["edges_explored"] += 1
                
                if neighbor not in visited:
                    visited.add(neighbor)
                    parent[neighbor] = current
                    queue.append(neighbor)
                    metrics["frontier_size"] = len(queue)
                    
                    edge_states[ek(current, neighbor)] = "frontier"
                    edge_states[ek(neighbor, current)] = "frontier"
                    
                    if node_states[neighbor] not in ("source", "target"):
                        node_states[neighbor] = "frontier"
                        
                        
                    #add step info
                    highlighted_entities = [
                        HighlightedEntity(
                            id = current,
                            state = node_states[current],
                            label = current
                        ),
                        HighlightedEntity(
                            id = neighbor,
                            state = "frontier",
                            label = neighbor
                        )
                    ]
                    
                    frontier_size = len(queue)
                    explanation = eb.build(
                        title = f"Enqueue '{neighbor}'",
                        body = f"Edge {current} -> {neighbor}: '{neighbor}' is unvisited. Frontier size is now {frontier_size}.",
                        data_snapshot = {
                            "queue": list(queue),
                            "visited": sorted(visited),
                            "edge": [current, neighbor],
                        },
                    )

                    add_step("ENQUEUE", highlighted_entities, explanation, frontier = list(queue), pseudocode_lines = [9, 10, 11, 12])
                    
                    
                else:
                    highlighted_entities = [
                        HighlightedEntity(
                            id = current,
                            state = node_states[current],
                            label = current
                        ),
                        HighlightedEntity(
                            id = neighbor,
                            state = node_states[neighbor],
                            label = neighbor
                        )
                    ]
                    explanation = eb.build(
                        title = f"Skip '{neighbor}'",
                        body = f"Edge {current} -> {neighbor}: '{neighbor}' already visited.",
                        data_snapshot = {
                            "queue": list(queue),
                            "visited": sorted(visited),
                        },
                    )

                    add_step("SKIP_EDGE", highlighted_entities, explanation, frontier = list(queue), pseudocode_lines = [9, 10])
                    
            if node_states[current] not in ("source", "target", "success"):
                node_states[current] = "visited"
                
                
            
            
        #COMPLETE
        if not path_found:
            visited_nodes = metrics["nodes_visited"]
            explored_edges = metrics["edges_explored"]
            result_message = f"No path found to '{target}'." if target else "All reachable nodes visited."
            
            explanation = eb.build(
                title = "BFS complete",
                body = f"Visited {visited_nodes} node(s), explored {explored_edges} edge(s). {result_message}",
                data_snapshot = {
                    "visited": sorted(visited),
                    "total_edges_explored": explored_edges,
                },
            )

            add_step("COMPLETE", [], explanation, frontier = [], pseudocode_lines = [13])
            
            
            
        # FINAL OUTPUT RETURNS
        final_result = {
            "path_found" : path_found,
            "path" : final_path or [],
            "nodes_visited" : metrics["nodes_visited"]
        }
        
        alg_metadata = self.build_metadata(algo_input) | {
            "time_complexity" : "O(V + E)",
            "space_complexity" : "O(V)",
            "weighted" : graph_input.weighted,
            "directed" : graph_input.directed
        }
        
        final_output = AlgorithmOutput(
            timeline_steps = steps,
            final_result = final_result,
            summary_metrics = metrics,
            algorithm_metadata = alg_metadata
        )
        
        return final_output

