import heapq
import math

from pydantic import ValidationError

from app.simulation.contract import BaseAlgorithm
from app.simulation.explanation_builder import ExplanationBuilder
from app.simulation.registry import register
from app.simulation.types import AlgorithmInput, AlgorithmOutput
from app.schemas.timeline import TimelineStep, HighlightedEntity
from app.schemas.payloads import GraphInputPayload
from app.exceptions import DomainError


@register("graph", "dijkstra")
class DijkstraAlgorithm(BaseAlgorithm):
    @property
    def module_type(self) -> str:
        return "graph"
    
    @property
    def algorithm_key(self) -> str:
        return "dijkstra"
    
    
    def run(self, algo_input: AlgorithmInput) -> AlgorithmOutput:
        eb = ExplanationBuilder(algo_input.explanation_level)
        
        # parse + validate
        try:
            graph_input = GraphInputPayload.model_validate(algo_input.input_payload)
            
        except ValidationError as e:
            raise DomainError("Invalid graph input", details = {"errors" : e.errors()})
        
        node_ids: list[str] = []
        for n in graph_input.nodes:
            node_ids.append(str(n.id))
            
        source: str = str(graph_input.source)
        target: str | None = str(graph_input.target) if graph_input.target is not None else None
        directed: bool = graph_input.directed
        
        if source not in node_ids:
            raise DomainError(f"Source node '{source}' not found in node list")
        
        if target and target not in node_ids:
            raise DomainError(f"Target node '{target}' not found in node list")
        
        
        #adj list
        adj: dict[str, list[tuple[str, float]]] = {}
        for n in node_ids:
            adj[n] = []
            
        for e in graph_input.edges:
            u = str(e.source)
            v = str(e.target)
            w = e.weight if e.weight is not None else 1.0
            
            adj[u].append((v, w))
            if not directed:
                adj[v].append((u, w))
                
                
        #simulation stuff
        node_states: dict[str, str] = {}
        for n in node_ids:
            node_states[n] = "default"
            
        edge_states: dict[str, str] = {}
        
        dist: dict[str, float] = {}
        for n in node_ids:
            dist[n] = math.inf
            
        parent: dict[str, str | None] = {}
        for n in node_ids:
            parent[n] = None
            
            
        steps: list[TimelineStep] = []
        metrics = {
            "nodes_visited" : 0,
            "edges_explored" : 0,
            "relaxations" : 0,
            "frontier_size" : 0
        }
        
        
        def ek(a: str, b: str) -> str:
            return f"{a}-{b}"
        
        
        def dist_display() -> dict[str, float | str]:
            result = {}
            
            for n, d in dist.items():
                if d != math.inf:
                    result[n] = d
                else:
                    result[n] = "inf"
                    
            return result
        
        
        def add_step(event_type: str, highlighted: list[HighlightedEntity], explanation: str, frontier_size: int = 0, path: list[str] | None = None, pseudocode_lines: list[int] | None = None) -> None:
            s_payload = {
                "node_states": dict(node_states),
                "edge_states": dict(edge_states),
                "frontier": [],
                "distances": dist_display(),
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
            
            
        #initialize
        dist[source] = 0
        node_states[source] = "source"
        if target:
            node_states[target] = "target"
            
        
        #minheap = distance, counter, node_id
        counter = 0
        heap: list[tuple[float, int, str]] = [(0, counter, source)]
        metrics["frontier_size"] = 1
        
        
        if target:
            target_message = f"Searching for shortest path to '{target}'."
        else:
            target_message = "Computing shortest paths to all reachable nodes."
            
        highlighted_entities = [HighlightedEntity(id = source, state = "source", label = source)]
        
        add_step(
            "INITIALIZE",
            highlighted_entities,
            eb.build(
                title = f"Initialize Dijkstra from '{source}'",
                body = f"Set dist[{source}] = 0, all others = inf. {target_message}",
                data_snapshot = {
                    "distances": dist_display(),
                    "priority_queue_size": 1,
                },
            ),
            frontier_size = 1,
            pseudocode_lines = [0, 1, 2, 3, 4],
        )
        
        path_found = False
        final_path: list[str] | None = None
        visited: set[str] = set()
        
        
        #main loop
        while heap:
            current_dist, _, current = heapq.heappop(heap)
            metrics["frontier_size"] = len(heap)
            
            if current in visited:
                continue
            
            visited.add(current)
            metrics["nodes_visited"] += 1
        
            if node_states[current] not in ("source", "target"):
                node_states[current] = "active"
                
                
            #pop min
            neighbors_count = len(adj[current])
            highlighted_entities = [HighlightedEntity(id = current, state = node_states[current], label = current)]
            add_step(
                "POP_MIN",
                highlighted_entities,
                eb.build(
                    title = f"Pop '{current}' (dist = {current_dist})",
                    body = f"Inspecting {neighbors_count} outgoing edge(s). {metrics['nodes_visited']} node(s) finalized so far.",
                    data_snapshot = {
                        "distances": dist_display(),
                        "visited": sorted(visited),
                        "priority_queue_size": len(heap),
                        "current_neighbors": [n for n, _ in adj[current]],
                    },
                ),
                frontier_size = len(heap),
                pseudocode_lines = [5, 6, 7],
            )
            
            #target check
            #when target popped, done
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
        
        
                #add step info
                path_string = " → ".join(path)
                
                highlighted_entities = []
                for n in path:
                    entity = HighlightedEntity(id = n, state = "success", label = n)
                    highlighted_entities.append(entity)
                    
                message = eb.build(
                    title = f"Target '{target}' reached",
                    body = f"Shortest path: {path_string} (cost {dist[target]}). Dijkstra guarantees shortest path in non-negative weighted graphs.",
                    data_snapshot = {
                        "path": path,
                        "path_cost": dist[target],
                        "distances": dist_display(),
                        "visited": sorted(visited),
                    },
                )

                add_step("PATH_FOUND", highlighted_entities, message, frontier_size = len(heap), path = path, pseudocode_lines = [8])
                
                path_found = True
                break
            
            
            #neighbors
            for neighbor, weight in adj[current]:
                metrics["edges_explored"] += 1
                new_dist = current_dist + weight
                
                if neighbor in visited:
                    
                    #add info
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
                    
                    message = eb.build(
                        title = f"Skip '{neighbor}'",
                        body = f"Edge {current} -> {neighbor} (w={weight}): '{neighbor}' already finalized at dist = {dist[neighbor]}.",
                        data_snapshot = {
                            "distances": dist_display(),
                            "visited": sorted(visited),
                            "edge": [current, neighbor],
                        },
                    )

                    add_step("SKIP_EDGE", highlighted_entities, message, frontier_size = len(heap), pseudocode_lines = [9, 10])
                    continue
                
                
                if new_dist < dist[neighbor]:
                    old_dist = dist[neighbor]
                    dist[neighbor] = new_dist
                    parent[neighbor] = current
                    
                    metrics["relaxations"] += 1
                    counter += 1
                    
                    heapq.heappush(heap, (new_dist, counter, neighbor))
                    metrics["frontier_size"] = len(heap)
                    
                    edge_states[ek(current, neighbor)] = "frontier"
                    edge_states[ek(neighbor, current)] = "frontier"
                    if node_states[neighbor] not in ("source", "target"):
                        node_states[neighbor] = "frontier"
                        
                        
                    old_label = "inf" if old_dist == math.inf else str(old_dist)
                    
                    
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
                    
                    message = eb.build(
                        title = f"Relax edge {current} -> {neighbor}",
                        body = f"Edge (w={weight}): dist[{neighbor}] updated from {old_label} to {new_dist}. Push to heap.",
                        data_snapshot = {
                            "distances": dist_display(),
                            "visited": sorted(visited),
                            "edge": [current, neighbor],
                            "weight": weight,
                            "old_dist": old_label,
                            "new_dist": new_dist,
                            "priority_queue_size": len(heap),
                        },
                    )
                    add_step("RELAX", highlighted_entities, message, frontier_size = len(heap), pseudocode_lines = [9, 10, 11, 12, 13])
                    
                    
                else:
                    highlighted_entities = [
                        HighlightedEntity(id = current, state = node_states[current], label = current),
                        HighlightedEntity(id = neighbor, state = node_states[neighbor], label = neighbor)
                    ]
                    message = eb.build(
                        title = f"No improvement for '{neighbor}'",
                        body = f"Edge {current} -> {neighbor} (w={weight}): dist[{neighbor}] = {dist[neighbor]} <= {new_dist}.",
                        data_snapshot = {
                            "distances": dist_display(),
                            "edge": [current, neighbor],
                            "weight": weight,
                            "current_dist": dist[neighbor],
                            "candidate_dist": new_dist,
                        },
                    )
                    add_step("NO_RELAX", highlighted_entities, message, frontier_size = len(heap), pseudocode_lines = [9, 10, 11])
                    
                    
            if node_states[current] not in ("source", "target", "success"):
                node_states[current] = "visited"
                
                
        #COMPLETE
        if not path_found:
            visited_nodes = metrics["nodes_visited"]
            explored_edges = metrics["edges_explored"]
            relaxation_count = metrics["relaxations"]
            
            result_message = f"No path found to '{target}'." if target else "All reachable nodes finalized."
            
            #add step info
            message = eb.build(
                title = "Dijkstra complete",
                body = f"Finalized {visited_nodes} node(s), explored {explored_edges} edge(s), {relaxation_count} relaxation(s). {result_message}",
                data_snapshot = {
                    "distances": dist_display(),
                    "visited": sorted(visited),
                    "total_relaxations": metrics["relaxations"],
                },
            )
            add_step("COMPLETE", [], message, frontier_size = 0, pseudocode_lines = [14])
            
            
        
        # FINAL OUTPUT RETURNS
        final_result = {
            "path_found" : path_found,
            "path" : final_path or [],
            "path_cost" : dist[target] if target and path_found else None,
            "nodes_visited" : metrics["nodes_visited"],
            "distances" : dist_display()
        }
        
        alg_metadata = self.build_metadata(algo_input) | {
            "time_complexity" : "O((V + E) log V)",
            "space_complexity" : "O(V + E)",
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
                
                
