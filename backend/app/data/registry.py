REGISTRY: dict = {
    "graph": {
        "label": "Graph and Pathfinding Lab",
        "description": "Supports interactive graph and grid-based algorithm visualizations with replayable traversal, pathfinding, and graph-structure analysis.",
        "features": [
            "graph_builder",
            "grid_maze_builder",
            "weighted_edges",
            "source_target_selection",
            "node_dragging_and_editing",
            "path_highlighting",
            "frontier_visited_visualization",
            "queue_heap_stack_inspection",
            "step_explanation",
        ],
        "algorithms": {
            "bfs": {
                "label": "Breadth-First Search",
                "description": "Explores nodes level by level using a queue. Finds shortest paths in unweighted graphs.",
                "supported_modes": ["simulate"],
                "supported_explanation_levels": ["none", "standard", "detailed"],
                "learning_info": {
                    "complexity": {
                        "time": {"best": "O(V + E)", "average": "O(V + E)", "worst": "O(V + E)"},
                        "space": "O(V)",
                    },
                    "properties": ["complete", "optimal-unweighted", "level-order"],
                    "insights": [
                        "Guarantees shortest path in unweighted graphs because it explores level by level",
                        "Visits all nodes at distance k before any node at distance k+1",
                    ],
                    "use_cases": {
                        "use_when": [
                            "Finding shortest path in unweighted graphs",
                            "Level-order traversal needed",
                            "Finding all nodes within a given distance",
                        ],
                        "avoid_when": [
                            "Graph is weighted — use Dijkstra's instead",
                            "Memory is constrained on very wide graphs",
                        ],
                    },
                    "scenarios": {
                        "best_case": "Target is adjacent to source — found in the first level",
                        "worst_case": "Target is the last node explored — entire graph traversed",
                    },
                },
            },
            "dfs": {
                "label": "Depth-First Search",
                "description": "Explores as far as possible along each branch before backtracking, using recursion or a stack.",
                "supported_modes": ["simulate"],
                "supported_explanation_levels": ["none", "standard", "detailed"],
                "learning_info": {
                    "complexity": {
                        "time": {"best": "O(V + E)", "average": "O(V + E)", "worst": "O(V + E)"},
                        "space": "O(V)",
                    },
                    "properties": ["not-optimal", "recursive", "backtracking"],
                    "insights": [
                        "Explores as deep as possible before backtracking — good for finding any path, not shortest",
                        "Call stack depth equals the longest path, which can overflow on deep graphs",
                    ],
                    "use_cases": {
                        "use_when": [
                            "Detecting cycles in a graph",
                            "Topological ordering of a DAG",
                            "Exploring all connected components",
                        ],
                        "avoid_when": [
                            "Shortest path is needed — use BFS instead",
                            "Graph is very deep and could overflow the call stack",
                        ],
                    },
                    "scenarios": {
                        "best_case": "Target is along the first explored branch",
                        "worst_case": "Target is in the last branch explored — entire graph traversed",
                    },
                },
            },
            "dijkstra": {
                "label": "Dijkstra's Algorithm",
                "description": "Finds the shortest path in a weighted graph using greedy distance relaxation and a priority queue.",
                "supported_modes": ["simulate"],
                "supported_explanation_levels": ["none", "standard", "detailed"],
                "learning_info": {
                    "complexity": {
                        "time": {"best": "O((V + E) log V)", "average": "O((V + E) log V)", "worst": "O((V + E) log V)"},
                        "space": "O(V)",
                    },
                    "properties": ["optimal-weighted", "greedy", "no-negative-weights"],
                    "insights": [
                        "Greedy approach: always processes the closest unvisited node, which guarantees optimality with non-negative weights",
                        "Fails with negative edge weights because a cheaper path might exist through an already-settled node",
                    ],
                    "use_cases": {
                        "use_when": [
                            "Finding shortest path in weighted graphs with non-negative edges",
                            "Single-source shortest paths to all nodes",
                        ],
                        "avoid_when": [
                            "Graph has negative edge weights — use Bellman-Ford",
                            "Graph is unweighted — BFS is simpler and equally optimal",
                        ],
                    },
                    "scenarios": {
                        "best_case": "Target is the closest neighbor of the source",
                        "worst_case": "Dense graph where all nodes must be settled before reaching the target",
                    },
                },
            },
            "astar": {
                "label": "A* Search",
                "description": "Finds shortest paths using distance-so-far plus a heuristic estimate to guide exploration toward the target.",
                "supported_modes": ["simulate"],
                "supported_explanation_levels": ["none", "standard", "detailed"],
                "learning_info": {
                    "complexity": {
                        "time": {"best": "O(E)", "average": "O((V + E) log V)", "worst": "O((V + E) log V)"},
                        "space": "O(V)",
                    },
                    "properties": ["optimal-with-admissible-heuristic", "heuristic-guided", "no-negative-weights"],
                    "insights": [
                        "Combines Dijkstra's real cost with a heuristic estimate to focus search toward the target",
                        "Optimal only when the heuristic never overestimates the true remaining cost (admissible)",
                    ],
                    "use_cases": {
                        "use_when": [
                            "Shortest path with a good distance heuristic available (e.g. Euclidean, Manhattan)",
                            "Grid-based pathfinding where coordinates provide natural heuristics",
                        ],
                        "avoid_when": [
                            "No meaningful heuristic exists — degrades to Dijkstra's",
                            "Graph has negative edge weights",
                        ],
                    },
                    "scenarios": {
                        "best_case": "Heuristic is near-perfect — search goes almost straight to the target",
                        "worst_case": "Heuristic is zero everywhere — behaves identically to Dijkstra's",
                    },
                },
            },
            "topological_sort": {
                "label": "Topological Sort",
                "description": "Orders nodes in a directed acyclic graph so that every directed edge goes from earlier to later in the ordering.",
                "supported_modes": ["simulate"],
                "supported_explanation_levels": ["none", "standard", "detailed"],
                "learning_info": {
                    "complexity": {
                        "time": {"best": "O(V + E)", "average": "O(V + E)", "worst": "O(V + E)"},
                        "space": "O(V)",
                    },
                    "properties": ["dag-only", "not-unique"],
                    "insights": [
                        "Only valid on directed acyclic graphs (DAGs) — presence of a cycle makes ordering impossible",
                        "Multiple valid orderings can exist; the algorithm finds one, not all",
                    ],
                    "use_cases": {
                        "use_when": [
                            "Scheduling tasks with dependency constraints",
                            "Build systems and compilation order",
                            "Course prerequisite planning",
                        ],
                        "avoid_when": [
                            "Graph has cycles — detect and report the cycle instead",
                            "Undirected graphs — topological order is undefined",
                        ],
                    },
                    "scenarios": {
                        "best_case": "Linear chain of dependencies — single valid ordering",
                        "worst_case": "Highly connected DAG — many valid orderings, full graph traversed regardless",
                    },
                },
            },
            "prims": {
                "label": "Prim's Algorithm",
                "description": "Builds a minimum spanning tree by repeatedly adding the cheapest edge that expands the current tree.",
                "supported_modes": ["simulate"],
                "supported_explanation_levels": ["none", "standard", "detailed"],
                "learning_info": {
                    "complexity": {
                        "time": {"best": "O((V + E) log V)", "average": "O((V + E) log V)", "worst": "O((V + E) log V)"},
                        "space": "O(V + E)",
                    },
                    "properties": ["greedy", "mst", "connected-graph-only"],
                    "insights": [
                        "Grows the MST from a single starting node by always adding the cheapest edge to a new vertex",
                        "Naturally suited for dense graphs because it works vertex-by-vertex",
                    ],
                    "use_cases": {
                        "use_when": [
                            "Finding minimum spanning tree in dense graphs",
                            "Incremental MST construction from a known starting point",
                        ],
                        "avoid_when": [
                            "Graph is sparse — Kruskal's with union-find is often faster",
                            "Graph is disconnected — must handle components separately",
                        ],
                    },
                    "scenarios": {
                        "best_case": "All edge weights are unique — no tie-breaking needed",
                        "worst_case": "Dense graph with many equal-weight edges — many heap operations",
                    },
                },
            },
            "kruskals": {
                "label": "Kruskal's Algorithm",
                "description": "Builds a minimum spanning tree by sorting edges by weight and adding them when they do not form a cycle.",
                "supported_modes": ["simulate"],
                "supported_explanation_levels": ["none", "standard", "detailed"],
                "learning_info": {
                    "complexity": {
                        "time": {"best": "O(E log E)", "average": "O(E log E)", "worst": "O(E log E)"},
                        "space": "O(V + E)",
                    },
                    "properties": ["greedy", "mst", "edge-based"],
                    "insights": [
                        "Sorts all edges globally then adds them if they don't form a cycle — uses union-find for cycle detection",
                        "Naturally suited for sparse graphs because edge sorting dominates the cost",
                    ],
                    "use_cases": {
                        "use_when": [
                            "Finding minimum spanning tree in sparse graphs",
                            "Edges are already sorted or easy to sort",
                        ],
                        "avoid_when": [
                            "Graph is very dense — Prim's with a priority queue may be faster",
                            "Need incremental tree building from a specific start node",
                        ],
                    },
                    "scenarios": {
                        "best_case": "Few edges relative to vertices — sorting is fast",
                        "worst_case": "Complete graph — O(V^2) edges to sort",
                    },
                },
            },
            "bellman_ford": {
                "label": "Bellman-Ford Algorithm",
                "description": "Finds shortest paths in weighted graphs, including graphs with negative edge weights, by repeated relaxation.",
                "supported_modes": ["simulate"],
                "supported_explanation_levels": ["none", "standard", "detailed"],
                "learning_info": {
                    "complexity": {
                        "time": {"best": "O(V * E)", "average": "O(V * E)", "worst": "O(V * E)"},
                        "space": "O(V)",
                    },
                    "properties": ["handles-negative-weights", "detects-negative-cycles", "slower-than-dijkstra"],
                    "insights": [
                        "Relaxes every edge V-1 times — handles negative weights because it doesn't commit to settled nodes early",
                        "An extra pass detects negative-weight cycles: if any distance still decreases, a negative cycle exists",
                    ],
                    "use_cases": {
                        "use_when": [
                            "Graph has negative edge weights",
                            "Need to detect negative-weight cycles",
                            "Correctness matters more than speed",
                        ],
                        "avoid_when": [
                            "All weights are non-negative — Dijkstra's is much faster",
                            "Graph is very large — O(V * E) becomes expensive",
                        ],
                    },
                    "scenarios": {
                        "best_case": "Shortest paths found in the first pass — early termination possible",
                        "worst_case": "Longest shortest path uses V-1 edges — requires all V-1 relaxation rounds",
                    },
                },
            },
            "bfs_grid": {
                "label": "BFS (Grid)",
                "description": "Explores grid cells level by level using a queue. Finds shortest paths by hop count on uniform-cost grids.",
                "supported_modes": ["simulate"],
                "supported_explanation_levels": ["none", "standard", "detailed"],
                "grid_only": True,
                "learning_info": {
                    "complexity": {
                        "time": {"best": "O(R * C)", "average": "O(R * C)", "worst": "O(R * C)"},
                        "space": "O(R * C)",
                    },
                    "properties": ["complete", "optimal-unweighted", "level-order", "grid-native"],
                    "insights": [
                        "Expands in concentric wavefronts from the source — every cell at distance k is explored before any at k+1",
                        "On a uniform-cost grid, hop count equals true shortest distance, making BFS optimal without a priority queue",
                    ],
                    "use_cases": {
                        "use_when": [
                            "Grid has uniform movement cost (no weighted diagonals)",
                            "Finding shortest path by number of steps",
                            "Visualizing the wavefront expansion pattern",
                        ],
                        "avoid_when": [
                            "Diagonal movement has different cost — use Dijkstra or A*",
                            "Grid is large and target is far — A* with a heuristic explores fewer cells",
                        ],
                    },
                    "scenarios": {
                        "best_case": "Target is adjacent to source — found in the first expansion",
                        "worst_case": "Target is in the opposite corner with no walls — entire grid explored",
                    },
                },
            },
            "dfs_grid": {
                "label": "DFS (Grid)",
                "description": "Explores grid cells depth-first using a stack, diving as far as possible before backtracking. Does not guarantee shortest paths.",
                "supported_modes": ["simulate"],
                "supported_explanation_levels": ["none", "standard", "detailed"],
                "grid_only": True,
                "learning_info": {
                    "complexity": {
                        "time": {"best": "O(R * C)", "average": "O(R * C)", "worst": "O(R * C)"},
                        "space": "O(R * C)",
                    },
                    "properties": ["not-optimal", "backtracking", "stack-based", "grid-native"],
                    "insights": [
                        "Dives deep along one direction before backtracking — the path it finds is usually not the shortest",
                        "Backtracking behavior is clearly visible on a grid, making it an excellent teaching tool for stack-based traversal",
                    ],
                    "use_cases": {
                        "use_when": [
                            "Exploring reachability — does any path exist between two cells",
                            "Maze generation and maze-solving demonstrations",
                            "Teaching stack-based traversal and backtracking concepts",
                        ],
                        "avoid_when": [
                            "Shortest path is needed — use BFS, Dijkstra, or A*",
                            "Grid is very deep with long dead-end corridors — stack depth grows linearly",
                        ],
                    },
                    "scenarios": {
                        "best_case": "Target is along the first explored direction — found quickly",
                        "worst_case": "Target is adjacent to source but explored last — nearly entire grid traversed with backtracking",
                    },
                },
            },
            "dijkstra_grid": {
                "label": "Dijkstra (Grid)",
                "description": "Finds shortest paths on weighted grids using a priority queue. Handles non-uniform movement costs such as diagonal steps.",
                "supported_modes": ["simulate"],
                "supported_explanation_levels": ["none", "standard", "detailed"],
                "grid_only": True,
                "learning_info": {
                    "complexity": {
                        "time": {"best": "O(R * C * log(R * C))", "average": "O(R * C * log(R * C))", "worst": "O(R * C * log(R * C))"},
                        "space": "O(R * C)",
                    },
                    "properties": ["optimal-weighted", "greedy", "handles-diagonal-cost", "grid-native"],
                    "insights": [
                        "Essential when diagonal moves cost more than cardinal moves — BFS assumes uniform cost and gives wrong shortest paths",
                        "On a uniform-cost grid without diagonals, Dijkstra behaves identically to BFS but with priority queue overhead",
                    ],
                    "use_cases": {
                        "use_when": [
                            "Grid allows diagonal movement with different cost than cardinal",
                            "Weighted terrain where movement cost varies by cell",
                            "Comparing Dijkstra's exploration pattern against A* on the same grid",
                        ],
                        "avoid_when": [
                            "Grid has uniform cost and no diagonals — BFS is simpler and equally optimal",
                            "A good heuristic is available — A* will explore fewer cells",
                        ],
                    },
                    "scenarios": {
                        "best_case": "Target is the closest cell by weighted distance — settled immediately",
                        "worst_case": "Open grid with target in the far corner — explores most cells before reaching it",
                    },
                },
            },
            "astar_grid": {
                "label": "A* (Grid)",
                "description": "Finds shortest paths using distance-so-far plus a heuristic estimate, focusing exploration toward the target. Auto-selects Manhattan or Octile heuristic.",
                "supported_modes": ["simulate"],
                "supported_explanation_levels": ["none", "standard", "detailed"],
                "grid_only": True,
                "learning_info": {
                    "complexity": {
                        "time": {"best": "O(R * C)", "average": "O(R * C * log(R * C))", "worst": "O(R * C * log(R * C))"},
                        "space": "O(R * C)",
                    },
                    "properties": ["optimal-with-admissible-heuristic", "heuristic-guided", "grid-native"],
                    "insights": [
                        "Auto-selects the best heuristic for the grid: Manhattan distance for 4-directional, Octile distance for 8-directional movement",
                        "On open grids, A* can reach the target while exploring a fraction of the cells Dijkstra would visit — the heuristic steers search toward the goal",
                    ],
                    "use_cases": {
                        "use_when": [
                            "Grid coordinates provide a natural distance heuristic",
                            "Shortest path needed with minimal cell exploration",
                            "Comparing heuristic-guided vs blind search on the same grid",
                        ],
                        "avoid_when": [
                            "Grid has uniform cost and no diagonals — BFS is simpler with identical results",
                            "Maze with many dead ends that the heuristic cannot anticipate — performance degrades toward Dijkstra's",
                        ],
                    },
                    "scenarios": {
                        "best_case": "Open grid with few obstacles — heuristic guides search nearly straight to the target",
                        "worst_case": "Dense maze where heuristic provides little guidance — explores nearly as many cells as Dijkstra",
                    },
                },
            },
        },
    },
    "sorting": {
        "label": "Sorting and Searching Lab",
        "description": "Supports animated bar and array visualizations for sorting and searching algorithms with operation tracking and replay.",
        "features": [
            "custom_random_arrays",
            "array_presets",
            "comparison_highlighting",
            "swap_highlighting",
            "pivot_partition_visualization",
            "operation_counts",
            "time_complexity_panel",
            "replay_and_explanation",
        ],
        "algorithms": {
            "bubble_sort": {
                "label": "Bubble Sort",
                "description": "Repeatedly compares adjacent elements and swaps them when out of order, bubbling larger values toward the end.",
                "supported_modes": ["simulate", "benchmark"],
                "supported_explanation_levels": ["none", "standard", "detailed"],
                "learning_info": {
                    "complexity": {
                        "time": {"best": "O(n)", "average": "O(n^2)", "worst": "O(n^2)"},
                        "space": "O(1)",
                    },
                    "properties": ["stable", "in-place", "adaptive"],
                    "insights": [
                        "Adaptive: can exit early if no swaps occur in a pass, making it O(n) on already-sorted input",
                        "Simple to implement but impractical for large datasets due to quadratic time",
                    ],
                    "use_cases": {
                        "use_when": [
                            "Teaching sorting fundamentals",
                            "Input is nearly sorted and very small",
                        ],
                        "avoid_when": [
                            "Dataset is larger than ~100 elements",
                            "Performance matters — almost any other sort is faster",
                        ],
                    },
                    "scenarios": {
                        "best_case": "Already sorted — one pass with zero swaps, O(n)",
                        "worst_case": "Reverse sorted — every pair must be swapped, O(n^2)",
                    },
                },
            },
            "insertion_sort": {
                "label": "Insertion Sort",
                "description": "Builds the sorted portion one element at a time by inserting each new value into its correct position.",
                "supported_modes": ["simulate", "benchmark"],
                "supported_explanation_levels": ["none", "standard", "detailed"],
                "learning_info": {
                    "complexity": {
                        "time": {"best": "O(n)", "average": "O(n^2)", "worst": "O(n^2)"},
                        "space": "O(1)",
                    },
                    "properties": ["stable", "in-place", "adaptive", "online"],
                    "insights": [
                        "Online: can sort elements as they arrive, one at a time",
                        "Outperforms O(n log n) sorts on small arrays — often used as the base case in hybrid sorts like Timsort",
                    ],
                    "use_cases": {
                        "use_when": [
                            "Input is small (< 20 elements) or nearly sorted",
                            "Data arrives incrementally and must stay sorted",
                        ],
                        "avoid_when": [
                            "Large unsorted datasets — quadratic time dominates",
                            "Random access is expensive (e.g. linked lists with no index)",
                        ],
                    },
                    "scenarios": {
                        "best_case": "Already sorted — each element stays in place, O(n)",
                        "worst_case": "Reverse sorted — every insertion shifts the entire sorted portion, O(n^2)",
                    },
                },
            },
            "selection_sort": {
                "label": "Selection Sort",
                "description": "Repeatedly selects the smallest remaining element and places it into the next sorted position.",
                "supported_modes": ["simulate", "benchmark"],
                "supported_explanation_levels": ["none", "standard", "detailed"],
                "learning_info": {
                    "complexity": {
                        "time": {"best": "O(n^2)", "average": "O(n^2)", "worst": "O(n^2)"},
                        "space": "O(1)",
                    },
                    "properties": ["not-stable", "in-place", "not-adaptive"],
                    "insights": [
                        "Always performs O(n^2) comparisons regardless of input — not adaptive",
                        "Minimizes the number of swaps (at most n) — useful when writes are expensive",
                    ],
                    "use_cases": {
                        "use_when": [
                            "Swap cost is very high (e.g. writing to flash memory)",
                            "Teaching sorting fundamentals",
                        ],
                        "avoid_when": [
                            "Dataset is anything but tiny",
                            "Stability is required — swaps can reorder equal elements",
                        ],
                    },
                    "scenarios": {
                        "best_case": "Already sorted — still O(n^2) comparisons, but 0 swaps",
                        "worst_case": "Any order — always O(n^2) comparisons with up to n swaps",
                    },
                },
            },
            "mergesort": {
                "label": "Merge Sort",
                "description": "Stable divide-and-conquer sort that recursively splits arrays and merges sorted halves in O(n log n) time.",
                "supported_modes": ["simulate", "benchmark"],
                "supported_explanation_levels": ["none", "standard", "detailed"],
                "learning_info": {
                    "complexity": {
                        "time": {"best": "O(n log n)", "average": "O(n log n)", "worst": "O(n log n)"},
                        "space": "O(n)",
                    },
                    "properties": ["stable", "not-in-place", "not-adaptive"],
                    "insights": [
                        "Guaranteed O(n log n) in all cases — no pathological inputs unlike QuickSort",
                        "Requires O(n) extra space for merging, which is the main trade-off vs in-place sorts",
                    ],
                    "use_cases": {
                        "use_when": [
                            "Stability is required",
                            "Worst-case O(n log n) guarantee is needed",
                            "Sorting linked lists — merge is natural and needs no extra space",
                        ],
                        "avoid_when": [
                            "Memory is constrained — O(n) auxiliary space is significant",
                            "In-place sorting is required",
                        ],
                    },
                    "scenarios": {
                        "best_case": "Any input — always O(n log n) due to recursive splitting",
                        "worst_case": "Any input — always O(n log n), performance is consistent",
                    },
                },
            },
            "quicksort": {
                "label": "Quick Sort",
                "description": "Divide-and-conquer sort using pivot partitioning. Average O(n log n) with low additional memory usage.",
                "supported_modes": ["simulate", "benchmark"],
                "supported_explanation_levels": ["none", "standard", "detailed"],
                "learning_info": {
                    "complexity": {
                        "time": {"best": "O(n log n)", "average": "O(n log n)", "worst": "O(n^2)"},
                        "space": "O(log n)",
                    },
                    "properties": ["not-stable", "in-place", "not-adaptive"],
                    "insights": [
                        "Fastest general-purpose sort in practice due to cache locality and low constant factors",
                        "Pivot choice is critical — median-of-three or randomized pivots avoid worst-case on sorted input",
                    ],
                    "use_cases": {
                        "use_when": [
                            "General-purpose sorting where average speed matters most",
                            "Memory is constrained — O(log n) stack space is minimal",
                        ],
                        "avoid_when": [
                            "Worst-case guarantee is needed — use Merge Sort",
                            "Stability is required — QuickSort is not stable",
                        ],
                    },
                    "scenarios": {
                        "best_case": "Pivot always lands at the median — balanced partitions, O(n log n)",
                        "worst_case": "Already sorted with first-element pivot — one-sided partitions, O(n^2)",
                    },
                },
            },
            "heap_sort": {
                "label": "Heap Sort",
                "description": "Uses a binary heap to repeatedly extract the maximum or minimum value and produce a sorted array.",
                "supported_modes": ["simulate", "benchmark"],
                "supported_explanation_levels": ["none", "standard", "detailed"],
                "learning_info": {
                    "complexity": {
                        "time": {"best": "O(n log n)", "average": "O(n log n)", "worst": "O(n log n)"},
                        "space": "O(1)",
                    },
                    "properties": ["not-stable", "in-place", "not-adaptive"],
                    "insights": [
                        "Combines the O(n log n) guarantee of Merge Sort with the O(1) space of in-place sorts",
                        "Poor cache locality compared to QuickSort — accessing heap children jumps around memory",
                    ],
                    "use_cases": {
                        "use_when": [
                            "Both O(n log n) worst-case and O(1) space are required",
                            "Systems where memory allocation is expensive or forbidden",
                        ],
                        "avoid_when": [
                            "Average-case speed matters most — QuickSort is faster in practice",
                            "Stability is required",
                        ],
                    },
                    "scenarios": {
                        "best_case": "Any input — always O(n log n) due to heap operations",
                        "worst_case": "Any input — always O(n log n), but constant factors are higher than QuickSort",
                    },
                },
            },
            "binary_search": {
                "label": "Binary Search",
                "description": "Searches a sorted array by repeatedly halving the remaining search interval.",
                "supported_modes": ["simulate", "benchmark"],
                "supported_explanation_levels": ["none", "standard", "detailed"],
                "learning_info": {
                    "complexity": {
                        "time": {"best": "O(1)", "average": "O(log n)", "worst": "O(log n)"},
                        "space": "O(1)",
                    },
                    "properties": ["requires-sorted-input", "divide-and-conquer"],
                    "insights": [
                        "Halves the search space with each comparison — 1 million elements needs at most 20 comparisons",
                        "Input must be sorted; the cost of sorting once is amortized across many searches",
                    ],
                    "use_cases": {
                        "use_when": [
                            "Searching a sorted array or list",
                            "Multiple searches on the same dataset",
                        ],
                        "avoid_when": [
                            "Data is unsorted and will only be searched once — linear search is simpler",
                            "Data changes frequently — maintaining sort order is expensive",
                        ],
                    },
                    "scenarios": {
                        "best_case": "Target is the middle element — found in one comparison",
                        "worst_case": "Target is at an extreme or absent — full log(n) comparisons",
                    },
                },
            },
            "linear_search": {
                "label": "Linear Search",
                "description": "Searches sequentially through an array until the target value is found or the array ends.",
                "supported_modes": ["simulate", "benchmark"],
                "supported_explanation_levels": ["none", "standard", "detailed"],
                "learning_info": {
                    "complexity": {
                        "time": {"best": "O(1)", "average": "O(n)", "worst": "O(n)"},
                        "space": "O(1)",
                    },
                    "properties": ["no-preconditions", "simple"],
                    "insights": [
                        "The simplest search — no sorting or structure required, works on any collection",
                        "Outperforms binary search on very small arrays due to zero overhead",
                    ],
                    "use_cases": {
                        "use_when": [
                            "Data is unsorted and will only be searched once",
                            "Dataset is very small (< 10 elements)",
                            "Searching a linked list or stream with no random access",
                        ],
                        "avoid_when": [
                            "Dataset is large and sorted — binary search is exponentially faster",
                            "Multiple searches on the same data — sort once, then binary search",
                        ],
                    },
                    "scenarios": {
                        "best_case": "Target is the first element — found immediately",
                        "worst_case": "Target is last or absent — every element checked",
                    },
                },
            },
        },
        "presets": [
            "random",
            "reversed",
            "nearly_sorted",
            "duplicates",
        ],
    },
    "dp": {
        "label": "Dynamic Programming Lab",
        "description": "Supports table-based dynamic programming visualizations and comparisons between recursive, memoized, and tabulated approaches.",
        "features": [
            "dp_table_visualization",
            "dependency_highlighting",
            "recurrence_explanation",
            "traceback_visualization",
            "memoization_hit_display",
            "input_builders_for_strings_items_weights",
        ],
        "algorithms": {
            "lcs": {
                "label": "Longest Common Subsequence",
                "description": "Finds the longest subsequence shared by two strings using a dynamic programming table and optional traceback.",
                "supported_modes": ["simulate"],
                "supported_explanation_levels": ["none", "standard", "detailed"],
                "learning_info": {
                    "complexity": {
                        "time": {"best": "O(m * n)", "average": "O(m * n)", "worst": "O(m * n)"},
                        "space": "O(m * n)",
                    },
                    "properties": ["optimal-substructure", "overlapping-subproblems", "tabulation"],
                    "insights": [
                        "Classic DP problem: optimal substructure means the LCS of two strings includes the LCS of their prefixes",
                        "Space can be optimized to O(min(m, n)) if only the length is needed, not the actual subsequence",
                    ],
                    "use_cases": {
                        "use_when": [
                            "Comparing two sequences for similarity (e.g. diff tools, DNA alignment)",
                            "Finding the longest shared structure between two strings",
                        ],
                        "avoid_when": [
                            "Strings are very long and memory is constrained — consider space-optimized variant",
                            "Exact substring matching is needed — use string search algorithms instead",
                        ],
                    },
                    "scenarios": {
                        "best_case": "Strings are identical — LCS equals the full length, but still O(m * n) to compute",
                        "worst_case": "No common characters — full table built with all zero entries",
                    },
                },
            },
            "edit_distance": {
                "label": "Edit Distance",
                "description": "Computes the minimum number of insertions, deletions, and substitutions needed to transform one string into another.",
                "supported_modes": ["simulate"],
                "supported_explanation_levels": ["none", "standard", "detailed"],
                "learning_info": {
                    "complexity": {
                        "time": {"best": "O(m * n)", "average": "O(m * n)", "worst": "O(m * n)"},
                        "space": "O(m * n)",
                    },
                    "properties": ["optimal-substructure", "overlapping-subproblems", "tabulation"],
                    "insights": [
                        "Measures the minimum cost to transform one string into another using insert, delete, and substitute",
                        "Each cell in the DP table represents the edit distance of two prefixes — the answer is in the bottom-right corner",
                    ],
                    "use_cases": {
                        "use_when": [
                            "Spell checking and fuzzy string matching",
                            "DNA sequence alignment and mutation counting",
                            "Measuring similarity between two strings",
                        ],
                        "avoid_when": [
                            "Exact matching is sufficient — simple comparison is O(n)",
                            "Strings are extremely long — O(m * n) may be too slow",
                        ],
                    },
                    "scenarios": {
                        "best_case": "Strings are identical — distance is 0, but still O(m * n) to verify via DP",
                        "worst_case": "Strings share no characters — distance equals the length of the longer string",
                    },
                },
            },
            "knapsack_01": {
                "label": "0/1 Knapsack",
                "description": "Selects items with weights and values to maximize total value without exceeding capacity, using dynamic programming.",
                "supported_modes": ["simulate"],
                "supported_explanation_levels": ["none", "standard", "detailed"],
                "learning_info": {
                    "complexity": {
                        "time": {"best": "O(n * W)", "average": "O(n * W)", "worst": "O(n * W)"},
                        "space": "O(n * W)",
                    },
                    "properties": ["optimal-substructure", "overlapping-subproblems", "pseudo-polynomial"],
                    "insights": [
                        "Pseudo-polynomial: runtime depends on the numeric value of capacity W, not just input size",
                        "Each item is either taken or skipped — no partial items (unlike fractional knapsack which is greedy)",
                    ],
                    "use_cases": {
                        "use_when": [
                            "Selecting items with weight/value trade-offs under a capacity constraint",
                            "Budget allocation and resource planning problems",
                        ],
                        "avoid_when": [
                            "Items can be split — use the greedy fractional knapsack instead",
                            "Capacity W is extremely large — table size becomes impractical",
                        ],
                    },
                    "scenarios": {
                        "best_case": "All items fit within capacity — no choices needed",
                        "worst_case": "Many items with weights near capacity — extensive subproblem evaluation",
                    },
                },
            },
            "coin_change": {
                "label": "Coin Change",
                "description": "Computes the minimum number of coins or number of ways to make a target amount using dynamic programming.",
                "supported_modes": ["simulate"],
                "supported_explanation_levels": ["none", "standard", "detailed"],
                "learning_info": {
                    "complexity": {
                        "time": {"best": "O(n * amount)", "average": "O(n * amount)", "worst": "O(n * amount)"},
                        "space": "O(amount)",
                    },
                    "properties": ["optimal-substructure", "overlapping-subproblems", "unbounded"],
                    "insights": [
                        "Unbounded: each coin denomination can be used unlimited times, unlike 0/1 Knapsack",
                        "Greedy doesn't work for arbitrary denominations — e.g. coins [1, 3, 4] with amount 6: greedy picks 4+1+1 (3 coins), DP finds 3+3 (2 coins)",
                    ],
                    "use_cases": {
                        "use_when": [
                            "Minimum number of coins to make change",
                            "Counting the number of distinct ways to make an amount",
                        ],
                        "avoid_when": [
                            "Denominations are powers of a base (e.g. 1, 5, 10, 25) — greedy works and is faster",
                            "Amount is extremely large — table size grows linearly with target",
                        ],
                    },
                    "scenarios": {
                        "best_case": "Amount is exactly one coin denomination — found in one step",
                        "worst_case": "Amount is large with small coin denominations — many subproblems to solve",
                    },
                },
            },
            "fibonacci": {
                "label": "Fibonacci Variants",
                "description": "Compares recursive, memoized, and tabulated solutions for Fibonacci to illustrate overlapping subproblems and optimization.",
                "supported_modes": ["simulate", "benchmark"],
                "supported_explanation_levels": ["none", "standard", "detailed"],
                "variants": ["recursion", "memoization", "tabulation"],
                "learning_info": {
                    "complexity": {
                        "time": {"best": "O(n)", "average": "O(n)", "worst": "O(n)"},
                        "space": "O(n)",
                    },
                    "properties": ["optimal-substructure", "overlapping-subproblems", "teaching-example"],
                    "insights": [
                        "The classic example of overlapping subproblems: naive recursion recomputes fib(k) exponentially many times",
                        "Demonstrates the progression from O(2^n) recursion to O(n) memoization/tabulation — the core DP insight",
                    ],
                    "use_cases": {
                        "use_when": [
                            "Teaching the difference between recursion, memoization, and tabulation",
                            "Illustrating why overlapping subproblems make naive recursion exponential",
                        ],
                        "avoid_when": [
                            "Computing very large Fibonacci numbers — use matrix exponentiation for O(log n)",
                            "This is primarily a teaching tool, not a practical algorithm",
                        ],
                    },
                    "scenarios": {
                        "best_case": "Small n — trivial base cases return immediately",
                        "worst_case": "Naive recursion on large n — exponential O(2^n) without memoization",
                    },
                },
            },
        },
    },
}
