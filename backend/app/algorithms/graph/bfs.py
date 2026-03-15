from collections import deque

from app.simulation.contract import BaseAlgorithm
from app.simulation.registry import register
from app.simulation.types import AlgorithmInput, AlgorithmOutput
from app.schemas.timeline import TimelineStep, HighlightedEntity
from app.exceptions import DomainError

@register("graph", "bfs")
class BFSAlgorithm(BaseAlgorithm):
    @property
    def module_type(self) -> str:
        return "graph"
    
    @property
    def algorithm_key(self):
        return "bfs"
    
    
    def run(self, algo_input: AlgorithmInput) -> AlgorithmOutput:
        payload = algo_input.input_payload
        explain = algo_input.explanation_level
        
        
        # payload parse
        node_ids = []
        for n in payload.get("nodes", []):
            node_ids.append(str(n["id"]))
            
        edges_raw = payload.get("edges", [])
        source: str = str(payload["source"])
        target = str(payload["target"]) if payload.get("target") else None
        
        #validations
        if source not in node_ids:
            raise DomainError(f"Source node '{source}' not found in node list")
    
        if target and target not in node_ids:
            raise DomainError(f"Target node '{target}' not found in node list")
        
        
        #adjacency list
        adj: dict[str, list[str]] = {}
        for n in node_ids:
            adj[n] = []
            
        for e in edges_raw:
            u = str(e["source"])
            v = str(e["target"])
            
            adj[u].append(v)
            adj[v].append(u)
            
        
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
        
        
        def add_step(event_type: str, highlighted: list[HighlightedEntity], explanation: str, frontier: list[str] | None = None, path: list[str] | None = None) -> None:
            s_payload = {
                "node_states" : dict(node_states),
                "edge_states" : dict(edge_states),
                "frontier" : list(frontier) if frontier is not None else [],
                "distances" : None,
                "path" : list(path) if path else None
            }
            
            step = TimelineStep(
                step_index = len(steps),
                event_type = event_type,
                state_payload = s_payload,
                highlighted_entities = highlighted,
                metrics_snapshot = dict(metrics),
                explanation = explanation if explain != "none" else None,
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
            
        add_step("INITIALIZE", initial_highlight, f"Initialize BFS from '{source}'. {target_message}", frontier = list(queue))
        
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
            
            explanation = (
                f"Dequeue '{current}' from the front of the queue. "
                f"Exploring its {neighbors_count} neighbor(s). "
                f"({visited_count} node(s) visited so far.)"
            )
            
            highlight = [
                HighlightedEntity(
                    id = current,
                    state = node_states[current],
                    label = current
                )
            ]
            
            add_step("DEQUEUE", highlight, explanation, frontier = list(queue))
            
            
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
                
                explanation = (
                    f"Target '{target}' found! "
                    f"Shortest path: {path_string} ({hops} hop(s)). "
                    "BFS guarantees the shortest path in an unweighted graph."
                )
                
                add_step("PATH_FOUND", highlighted_path, explanation, frontier = list(queue), path = path)
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
                    explanation = (
                        f"Edge {current} → {neighbor}: '{neighbor}' is unvisited. "
                        f"Enqueue it. Frontier size is now {frontier_size}."
                    )
                    
                    add_step("ENQUEUE", highlighted_entities, explanation, frontier = list(queue))
                    
                    
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
                    explanation = (
                        f"Edge {current} → {neighbor}: "
                        f"'{neighbor}' is already visited. Skip."
                    )
                    
                    add_step("SKIP_EDGE", highlighted_entities, explanation, frontier = list(queue))
                    
            if node_states[current] not in ("source", "target", "success"):
                node_states[current] = "visited"
                
                
            
            
        #COMPLETE
        if not path_found:
            visited_nodes = metrics["nodes_visited"]
            explored_edges = metrics["edges_explored"]
            result_message = f"No path found to '{target}'." if target else "All reachable nodes visited."
            
            explanation = (
                f"BFS complete. Visited {visited_nodes} node(s), "
                f"explored {explored_edges} edge(s). "
                f"{result_message}"
            )
            
            add_step("COMPLETE", [], explanation, frontier = [])
            
            
            
        # FINAL OUTPUT RETURNS
        final_result = {
            "path_found" : path_found,
            "path" : final_path or [],
            "nodes_visited" : metrics["nodes_visited"]
        }
        
        alg_metadata = self.build_metadata(algo_input) | {
            "time_complexity" : "O(V + E)",
            "space_complexity" : "O(V)",
            "weighted" : False,
            "directed" : False
        }
        
        final_output = AlgorithmOutput(
            timeline_steps = steps,
            final_result = final_result,
            summary_metrics = metrics,
            algorithm_metadata = alg_metadata
        )
        
        return final_output

