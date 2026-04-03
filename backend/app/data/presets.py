PRESETS: dict = {
    "graph": {
        "general": [
            {
                "key": "bfs-demo",
                "label": "BFS Demo — 6 nodes",
                "description": "Simple unweighted graph for breadth-first traversal",
                "tags": ["pathfinding"],
                "input_payload": {
                    "nodes": [
                        {"id": "A"}, {"id": "B"}, {"id": "C"},
                        {"id": "D"}, {"id": "E"}, {"id": "F"},
                    ],
                    "edges": [
                        {"source": "A", "target": "B"}, {"source": "A", "target": "C"},
                        {"source": "B", "target": "D"}, {"source": "C", "target": "E"},
                        {"source": "D", "target": "F"}, {"source": "E", "target": "F"},
                    ],
                    "source": "A",
                    "target": "F",
                    "weighted": False,
                },
            },
            {
                "key": "weighted-diamond",
                "label": "Weighted Diamond — 5 nodes",
                "description": "Classic diamond graph with weighted edges to demonstrate shortest path choices",
                "tags": ["pathfinding"],
                "input_payload": {
                    "nodes": [
                        {"id": "S"}, {"id": "A"}, {"id": "B"},
                        {"id": "C"}, {"id": "T"},
                    ],
                    "edges": [
                        {"source": "S", "target": "A", "weight": 1},
                        {"source": "S", "target": "B", "weight": 4},
                        {"source": "A", "target": "C", "weight": 2},
                        {"source": "B", "target": "C", "weight": 1},
                        {"source": "C", "target": "T", "weight": 3},
                        {"source": "A", "target": "B", "weight": 2},
                    ],
                    "source": "S",
                    "target": "T",
                    "weighted": True,
                },
            },
            {
                "key": "weighted-grid",
                "label": "Weighted 4x4 Grid — 8 nodes",
                "description": "Weighted grid-like topology with multiple paths of varying cost",
                "tags": ["pathfinding"],
                "input_payload": {
                    "nodes": [
                        {"id": "1"}, {"id": "2"}, {"id": "3"}, {"id": "4"},
                        {"id": "5"}, {"id": "6"}, {"id": "7"}, {"id": "8"},
                    ],
                    "edges": [
                        {"source": "1", "target": "2", "weight": 2},
                        {"source": "1", "target": "3", "weight": 5},
                        {"source": "2", "target": "4", "weight": 3},
                        {"source": "2", "target": "5", "weight": 1},
                        {"source": "3", "target": "5", "weight": 2},
                        {"source": "3", "target": "6", "weight": 4},
                        {"source": "4", "target": "7", "weight": 1},
                        {"source": "5", "target": "7", "weight": 6},
                        {"source": "5", "target": "8", "weight": 3},
                        {"source": "6", "target": "8", "weight": 2},
                        {"source": "7", "target": "8", "weight": 1},
                    ],
                    "source": "1",
                    "target": "8",
                    "weighted": True,
                },
            },
            {
                "key": "astar-coords",
                "label": "A* with Coordinates — 6 nodes",
                "description": "Graph with node coordinates for A* heuristic computation",
                "tags": ["pathfinding"],
                "input_payload": {
                    "nodes": [
                        {"id": "S", "x": 0, "y": 100},
                        {"id": "A", "x": 80, "y": 30},
                        {"id": "B", "x": 80, "y": 170},
                        {"id": "C", "x": 180, "y": 50},
                        {"id": "D", "x": 180, "y": 150},
                        {"id": "T", "x": 280, "y": 100},
                    ],
                    "edges": [
                        {"source": "S", "target": "A", "weight": 3},
                        {"source": "S", "target": "B", "weight": 4},
                        {"source": "A", "target": "C", "weight": 4},
                        {"source": "B", "target": "D", "weight": 3},
                        {"source": "A", "target": "D", "weight": 5},
                        {"source": "C", "target": "T", "weight": 4},
                        {"source": "D", "target": "T", "weight": 3},
                    ],
                    "source": "S",
                    "target": "T",
                    "weighted": True,
                },
            },
            {
                "key": "neg-weight",
                "label": "Negative Weights — 5 nodes",
                "description": "Directed graph with a negative-weight edge for Bellman-Ford",
                "tags": ["pathfinding"],
                "input_payload": {
                    "nodes": [
                        {"id": "S"}, {"id": "A"}, {"id": "B"},
                        {"id": "C"}, {"id": "T"},
                    ],
                    "edges": [
                        {"source": "S", "target": "A", "weight": 4},
                        {"source": "S", "target": "B", "weight": 5},
                        {"source": "A", "target": "B", "weight": -3},
                        {"source": "A", "target": "C", "weight": 6},
                        {"source": "B", "target": "C", "weight": 2},
                        {"source": "C", "target": "T", "weight": 1},
                    ],
                    "source": "S",
                    "target": "T",
                    "weighted": True,
                    "directed": True,
                },
            },
            {
                "key": "mst-demo",
                "label": "MST Demo — 6 nodes",
                "description": "Connected weighted graph for minimum spanning tree algorithms",
                "tags": ["mst"],
                "input_payload": {
                    "nodes": [
                        {"id": "A"}, {"id": "B"}, {"id": "C"},
                        {"id": "D"}, {"id": "E"}, {"id": "F"},
                    ],
                    "edges": [
                        {"source": "A", "target": "B", "weight": 1},
                        {"source": "A", "target": "C", "weight": 4},
                        {"source": "B", "target": "C", "weight": 2},
                        {"source": "B", "target": "D", "weight": 6},
                        {"source": "C", "target": "D", "weight": 3},
                        {"source": "C", "target": "E", "weight": 5},
                        {"source": "D", "target": "E", "weight": 7},
                        {"source": "D", "target": "F", "weight": 4},
                        {"source": "E", "target": "F", "weight": 2},
                    ],
                    "source": "A",
                    "weighted": True,
                },
            },
            {
                "key": "dag-prereqs",
                "label": "DAG — Course Prerequisites",
                "description": "Directed acyclic graph modeling course prerequisites",
                "tags": ["ordering"],
                "input_payload": {
                    "nodes": [
                        {"id": "CS101"}, {"id": "CS201"}, {"id": "CS301"},
                        {"id": "MATH"}, {"id": "CS202"}, {"id": "CS401"},
                        {"id": "CS402"},
                    ],
                    "edges": [
                        {"source": "CS101", "target": "CS201"},
                        {"source": "CS101", "target": "CS202"},
                        {"source": "MATH", "target": "CS301"},
                        {"source": "CS201", "target": "CS301"},
                        {"source": "CS202", "target": "CS401"},
                        {"source": "CS301", "target": "CS401"},
                        {"source": "CS301", "target": "CS402"},
                    ],
                    "weighted": False,
                    "directed": True,
                },
            },
            {
                "key": "dag-cycle",
                "label": "DAG with Cycle — 4 nodes",
                "description": "Directed graph containing a cycle (tests cycle detection)",
                "tags": ["ordering"],
                "input_payload": {
                    "nodes": [
                        {"id": "A"}, {"id": "B"}, {"id": "C"}, {"id": "D"},
                    ],
                    "edges": [
                        {"source": "A", "target": "B"},
                        {"source": "B", "target": "C"},
                        {"source": "C", "target": "A"},
                        {"source": "C", "target": "D"},
                    ],
                    "weighted": False,
                    "directed": True,
                },
            },
        ],
    },
    "dp": {
        "lcs": [
            {
                "key": "short_match",
                "label": "Short — obvious match",
                "input_payload": {"string1": "ABCDEF", "string2": "ACBDFE"},
            },
            {
                "key": "no_match",
                "label": "No common characters",
                "input_payload": {"string1": "ABC", "string2": "XYZ"},
            },
            {
                "key": "identical",
                "label": "Identical strings",
                "input_payload": {"string1": "MATCH", "string2": "MATCH"},
            },
            {
                "key": "single_char",
                "label": "Single character each",
                "input_payload": {"string1": "A", "string2": "B"},
            },
            {
                "key": "substitutions",
                "label": "Substitution-heavy",
                "input_payload": {"string1": "kitten", "string2": "sitting"},
            },
            {
                "key": "insert_delete",
                "label": "Insert / delete mix",
                "input_payload": {"string1": "abcde", "string2": "aebdc"},
            },
            {
                "key": "medium",
                "label": "Medium strings",
                "input_payload": {"string1": "ALGORITHM", "string2": "ALTRUISTIC"},
            },
        ],
        "edit_distance": [
            {
                "key": "short_match",
                "label": "Short — obvious match",
                "input_payload": {"string1": "ABCDEF", "string2": "ACBDFE"},
            },
            {
                "key": "no_match",
                "label": "No common characters",
                "input_payload": {"string1": "ABC", "string2": "XYZ"},
            },
            {
                "key": "identical",
                "label": "Identical strings",
                "input_payload": {"string1": "MATCH", "string2": "MATCH"},
            },
            {
                "key": "single_char",
                "label": "Single character each",
                "input_payload": {"string1": "A", "string2": "B"},
            },
            {
                "key": "substitutions",
                "label": "Substitution-heavy",
                "input_payload": {"string1": "kitten", "string2": "sitting"},
            },
            {
                "key": "insert_delete",
                "label": "Insert / delete mix",
                "input_payload": {"string1": "abcde", "string2": "aebdc"},
            },
            {
                "key": "medium",
                "label": "Medium strings",
                "input_payload": {"string1": "ALGORITHM", "string2": "ALTRUISTIC"},
            },
        ],
        "knapsack_01": [
            {
                "key": "textbook",
                "label": "Textbook classic",
                "input_payload": {
                    "capacity": 10,
                    "items": [
                        {"weight": 2, "value": 3},
                        {"weight": 3, "value": 4},
                        {"weight": 4, "value": 5},
                        {"weight": 5, "value": 6},
                    ],
                },
            },
            {
                "key": "tight_fit",
                "label": "Tight fit",
                "input_payload": {
                    "capacity": 7,
                    "items": [
                        {"weight": 3, "value": 4},
                        {"weight": 4, "value": 5},
                        {"weight": 5, "value": 7},
                    ],
                },
            },
            {
                "key": "single_item",
                "label": "Single item",
                "input_payload": {
                    "capacity": 5,
                    "items": [{"weight": 3, "value": 10}],
                },
            },
            {
                "key": "all_fit",
                "label": "All fit",
                "input_payload": {
                    "capacity": 50,
                    "items": [
                        {"weight": 2, "value": 3},
                        {"weight": 3, "value": 4},
                        {"weight": 5, "value": 8},
                    ],
                },
            },
        ],
        "coin_change": [
            {
                "key": "us_coins",
                "label": "US coins",
                "input_payload": {"coins": [1, 5, 10, 25], "target": 41},
            },
            {
                "key": "greedy_fails",
                "label": "Greedy fails",
                "input_payload": {"coins": [1, 3, 4], "target": 6},
            },
            {
                "key": "impossible",
                "label": "Impossible",
                "input_payload": {"coins": [3, 7], "target": 5},
            },
            {
                "key": "powers_of_2",
                "label": "Powers of 2",
                "input_payload": {"coins": [1, 2, 4, 8, 16], "target": 31},
            },
        ],
        "fibonacci": [
            {
                "key": "small",
                "label": "Small (n=8)",
                "input_payload": {"n": 8},
            },
            {
                "key": "medium",
                "label": "Medium (n=15)",
                "input_payload": {"n": 15},
            },
            {
                "key": "large",
                "label": "Large (n=30)",
                "input_payload": {"n": 30},
            },
            {
                "key": "max_tab",
                "label": "Max tabulation (n=50)",
                "input_payload": {"n": 50},
            },
        ],
    },
}
