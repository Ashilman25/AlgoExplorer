import pytest

from app.algorithms.graph.bfs import BFSAlgorithm
from app.algorithms.graph.dijkstra import DijkstraAlgorithm
from app.algorithms.graph.dfs import DFSAlgorithm
from app.algorithms.graph.astar import AStarAlgorithm
from app.algorithms.graph.bellman_ford import BellmanFordAlgorithm
from app.algorithms.graph.prims import PrimsAlgorithm
from app.algorithms.graph.kruskals import KruskalsAlgorithm
from app.algorithms.graph.topological_sort import TopologicalSortAlgorithm
from app.exceptions import DomainError
from app.simulation.types import AlgorithmInput


GRAPH_PAYLOAD = {
    "nodes": [{"id": "A"}, {"id": "B"}, {"id": "C"}, {"id": "D"}],
    "edges": [
        {"source": "A", "target": "B"},
        {"source": "A", "target": "C"},
        {"source": "B", "target": "D"},
        {"source": "C", "target": "D"},
    ],
    "source": "A",
    "target": "D",
    "weighted": False,
    "directed": False,
    "mode": "graph",
}

WEIGHTED_GRAPH_PAYLOAD = {
    "nodes": [{"id": "S"}, {"id": "A"}, {"id": "B"}, {"id": "T"}],
    "edges": [
        {"source": "S", "target": "A", "weight": 1},
        {"source": "S", "target": "B", "weight": 5},
        {"source": "A", "target": "B", "weight": 1},
        {"source": "B", "target": "T", "weight": 1},
        {"source": "A", "target": "T", "weight": 10},
    ],
    "source": "S",
    "target": "T",
    "weighted": True,
    "directed": False,
    "mode": "graph",
}

DISCONNECTED_GRAPH_PAYLOAD = {
    "nodes": [{"id": "A"}, {"id": "B"}, {"id": "C"}],
    "edges": [{"source": "A", "target": "B"}],
    "source": "A",
    "target": "C",
    "weighted": False,
    "directed": False,
    "mode": "graph",
}

DISCONNECTED_WEIGHTED_GRAPH_PAYLOAD = {
    "nodes": [{"id": "S"}, {"id": "A"}, {"id": "T"}],
    "edges": [{"source": "S", "target": "A", "weight": 2}],
    "source": "S",
    "target": "T",
    "weighted": True,
    "directed": False,
    "mode": "graph",
}

DIRECTED_GRAPH_PAYLOAD = {
    "nodes": [{"id": "A"}, {"id": "B"}, {"id": "C"}, {"id": "D"}],
    "edges": [
        {"source": "A", "target": "B"},
        {"source": "B", "target": "C"},
        {"source": "C", "target": "D"},
    ],
    "source": "A",
    "target": "D",
    "weighted": False,
    "directed": True,
    "mode": "graph",
}

COORDINATE_GRAPH_PAYLOAD = {
    "nodes": [
        {"id": "A", "x": 0.0, "y": 0.0},
        {"id": "B", "x": 3.0, "y": 0.0},
        {"id": "C", "x": 0.0, "y": 4.0},
        {"id": "D", "x": 3.0, "y": 4.0},
        {"id": "E", "x": 6.0, "y": 2.0},
    ],
    "edges": [
        {"source": "A", "target": "B", "weight": 3},
        {"source": "A", "target": "C", "weight": 4},
        {"source": "B", "target": "D", "weight": 4},
        {"source": "B", "target": "E", "weight": 5},
        {"source": "C", "target": "D", "weight": 3},
        {"source": "D", "target": "E", "weight": 3},
    ],
    "source": "A",
    "target": "E",
    "weighted": True,
    "directed": False,
    "mode": "graph",
}

NEGATIVE_WEIGHT_GRAPH_PAYLOAD = {
    "nodes": [{"id": "S"}, {"id": "A"}, {"id": "B"}, {"id": "T"}],
    "edges": [
        {"source": "S", "target": "A", "weight": 4},
        {"source": "S", "target": "B", "weight": 5},
        {"source": "A", "target": "B", "weight": -3},
        {"source": "B", "target": "T", "weight": 2},
    ],
    "source": "S",
    "target": "T",
    "weighted": True,
    "directed": True,
    "mode": "graph",
}

NEGATIVE_CYCLE_GRAPH_PAYLOAD = {
    "nodes": [{"id": "S"}, {"id": "A"}, {"id": "B"}, {"id": "C"}],
    "edges": [
        {"source": "S", "target": "A", "weight": 1},
        {"source": "A", "target": "B", "weight": -2},
        {"source": "B", "target": "C", "weight": -1},
        {"source": "C", "target": "A", "weight": 1},
    ],
    "source": "S",
    "target": "C",
    "weighted": True,
    "directed": True,
    "mode": "graph",
}

MST_GRAPH_PAYLOAD = {
    "nodes": [{"id": "A"}, {"id": "B"}, {"id": "C"}, {"id": "D"}, {"id": "E"}],
    "edges": [
        {"source": "A", "target": "B", "weight": 1},
        {"source": "A", "target": "C", "weight": 4},
        {"source": "B", "target": "C", "weight": 2},
        {"source": "B", "target": "D", "weight": 6},
        {"source": "C", "target": "D", "weight": 3},
        {"source": "C", "target": "E", "weight": 5},
        {"source": "D", "target": "E", "weight": 7},
    ],
    "source": "A",
    "weighted": True,
    "directed": False,
    "mode": "graph",
}

DAG_PAYLOAD = {
    "nodes": [{"id": "A"}, {"id": "B"}, {"id": "C"}, {"id": "D"}, {"id": "E"}, {"id": "F"}],
    "edges": [
        {"source": "A", "target": "B"},
        {"source": "A", "target": "C"},
        {"source": "B", "target": "D"},
        {"source": "C", "target": "D"},
        {"source": "C", "target": "E"},
        {"source": "D", "target": "F"},
        {"source": "E", "target": "F"},
    ],
    "weighted": False,
    "directed": True,
    "mode": "graph",
}

CYCLIC_DIRECTED_GRAPH_PAYLOAD = {
    "nodes": [{"id": "A"}, {"id": "B"}, {"id": "C"}, {"id": "D"}],
    "edges": [
        {"source": "A", "target": "B"},
        {"source": "B", "target": "C"},
        {"source": "C", "target": "A"},
        {"source": "C", "target": "D"},
    ],
    "weighted": False,
    "directed": True,
    "mode": "graph",
}

SINGLE_NODE_GRAPH_PAYLOAD = {
    "nodes": [{"id": "X"}],
    "edges": [],
    "source": "X",
    "weighted": False,
    "directed": False,
    "mode": "graph",
}


def build_input(payload: dict) -> AlgorithmInput:
    return AlgorithmInput(
        input_payload=payload,
        execution_mode="simulate",
        explanation_level="standard",
    )


def assert_common_metadata(metadata: dict, module_type: str, algorithm_key: str) -> None:
    assert metadata["module_type"] == module_type
    assert metadata["algorithm_key"] == algorithm_key
    assert metadata["execution_mode"] == "simulate"
    assert metadata["explanation_level"] == "standard"
    assert metadata["config"] == {}


def test_bfs_finds_shortest_unweighted_path():
    output = BFSAlgorithm().run(build_input(GRAPH_PAYLOAD))

    assert output.final_result == {
        "path_found": True,
        "path": ["A", "B", "D"],
        "nodes_visited": 4,
    }
    assert output.summary_metrics == {
        "nodes_visited": 4,
        "edges_explored": 6,
        "frontier_size": 0,
    }
    assert len(output.timeline_steps) == 12
    assert output.timeline_steps[0].event_type == "INITIALIZE"
    assert output.timeline_steps[-1].event_type == "PATH_FOUND"
    assert output.timeline_steps[-1].state_payload["path"] == ["A", "B", "D"]
    assert output.timeline_steps[-1].metrics_snapshot == output.summary_metrics
    assert_common_metadata(output.algorithm_metadata, "graph", "bfs")
    assert output.algorithm_metadata["time_complexity"] == "O(V + E)"
    assert output.algorithm_metadata["space_complexity"] == "O(V)"
    assert output.algorithm_metadata["weighted"] is False
    assert output.algorithm_metadata["directed"] is False


def test_bfs_returns_complete_when_target_is_unreachable():
    output = BFSAlgorithm().run(build_input(DISCONNECTED_GRAPH_PAYLOAD))

    assert output.final_result == {
        "path_found": False,
        "path": [],
        "nodes_visited": 2,
    }
    assert output.summary_metrics == {
        "nodes_visited": 2,
        "edges_explored": 2,
        "frontier_size": 0,
    }
    assert len(output.timeline_steps) == 6
    assert output.timeline_steps[-1].event_type == "COMPLETE"
    assert output.timeline_steps[-1].state_payload["path"] is None


def test_dijkstra_finds_lowest_cost_path_and_distances():
    output = DijkstraAlgorithm().run(build_input(WEIGHTED_GRAPH_PAYLOAD))

    assert output.final_result == {
        "path_found": True,
        "path": ["S", "A", "B", "T"],
        "path_cost": 3.0,
        "nodes_visited": 4,
        "distances": {"S": 0, "A": 1.0, "B": 2.0, "T": 3.0},
    }
    assert output.summary_metrics == {
        "nodes_visited": 4,
        "edges_explored": 8,
        "relaxations": 5,
        "frontier_size": 2,
    }
    assert len(output.timeline_steps) == 14
    assert output.timeline_steps[0].event_type == "INITIALIZE"
    assert output.timeline_steps[-1].event_type == "PATH_FOUND"
    assert output.timeline_steps[-1].state_payload["path"] == ["S", "A", "B", "T"]
    assert output.timeline_steps[-1].metrics_snapshot == output.summary_metrics
    assert_common_metadata(output.algorithm_metadata, "graph", "dijkstra")
    assert output.algorithm_metadata["time_complexity"] == "O((V + E) log V)"
    assert output.algorithm_metadata["space_complexity"] == "O(V + E)"
    assert output.algorithm_metadata["weighted"] is True
    assert output.algorithm_metadata["directed"] is False


def test_dijkstra_returns_complete_when_target_is_unreachable():
    output = DijkstraAlgorithm().run(build_input(DISCONNECTED_WEIGHTED_GRAPH_PAYLOAD))

    assert output.final_result == {
        "path_found": False,
        "path": [],
        "path_cost": None,
        "nodes_visited": 2,
        "distances": {"S": 0, "A": 2.0, "T": "inf"},
    }
    assert output.summary_metrics == {
        "nodes_visited": 2,
        "edges_explored": 2,
        "relaxations": 1,
        "frontier_size": 0,
    }
    assert len(output.timeline_steps) == 6
    assert output.timeline_steps[-1].event_type == "COMPLETE"
    assert output.timeline_steps[-1].state_payload["path"] is None


@pytest.mark.parametrize(
    ("algorithm_cls", "payload", "message"),
    [
        (
            BFSAlgorithm,
            {"edges": [], "source": "A", "target": "A", "weighted": False, "directed": False, "mode": "graph"},
            "Invalid graph input.",
        ),
        (
            DijkstraAlgorithm,
            {"nodes": [{"id": "A"}], "edges": [], "source": "Z", "target": "A", "weighted": True, "directed": False, "mode": "graph"},
            "Source node 'Z' not found in node list",
        ),
    ],
)
def test_graph_algorithms_fail_cleanly_on_invalid_input(algorithm_cls, payload, message):
    with pytest.raises(DomainError, match=message):
        algorithm_cls().run(build_input(payload))


def test_dfs_finds_path_in_connected_graph():
    output = DFSAlgorithm().run(build_input(GRAPH_PAYLOAD))

    assert output.final_result["path_found"] is True
    assert output.final_result["path"][0] == "A"
    assert output.final_result["path"][-1] == "D"
    assert output.final_result["nodes_visited"] >= 2
    assert output.timeline_steps[0].event_type == "INITIALIZE"
    assert output.timeline_steps[-1].event_type == "PATH_FOUND"
    assert output.timeline_steps[-1].state_payload["path"] is not None
    assert_common_metadata(output.algorithm_metadata, "graph", "dfs")
    assert output.algorithm_metadata["time_complexity"] == "O(V + E)"
    assert output.algorithm_metadata["space_complexity"] == "O(V)"


def test_dfs_returns_complete_when_target_unreachable():
    output = DFSAlgorithm().run(build_input(DISCONNECTED_GRAPH_PAYLOAD))

    assert output.final_result["path_found"] is False
    assert output.final_result["path"] == []
    assert output.timeline_steps[-1].event_type == "COMPLETE"


def test_dfs_respects_directed_edges():
    output = DFSAlgorithm().run(build_input(DIRECTED_GRAPH_PAYLOAD))

    assert output.final_result["path_found"] is True
    path = output.final_result["path"]
    assert path == ["A", "B", "C", "D"]


def test_dfs_single_node():
    payload = {**SINGLE_NODE_GRAPH_PAYLOAD, "target": None}
    output = DFSAlgorithm().run(build_input(payload))

    assert output.final_result["path_found"] is False
    assert output.final_result["nodes_visited"] == 1
    assert output.timeline_steps[0].event_type == "INITIALIZE"
    assert output.timeline_steps[-1].event_type == "COMPLETE"


def test_astar_finds_optimal_path_with_heuristic():
    output = AStarAlgorithm().run(build_input(COORDINATE_GRAPH_PAYLOAD))

    assert output.final_result["path_found"] is True
    path = output.final_result["path"]
    assert path[0] == "A"
    assert path[-1] == "E"
    assert output.final_result["path_cost"] is not None
    assert output.timeline_steps[0].event_type == "INITIALIZE"
    assert output.timeline_steps[-1].event_type == "PATH_FOUND"
    assert_common_metadata(output.algorithm_metadata, "graph", "astar")
    assert output.algorithm_metadata["time_complexity"] == "O((V + E) log V)"

    # verify heuristic_values in state_payload
    last_step = output.timeline_steps[-1]
    assert "heuristic_values" in last_step.state_payload


def test_astar_disconnected_graph():
    payload = {
        "nodes": [
            {"id": "A", "x": 0.0, "y": 0.0},
            {"id": "B", "x": 1.0, "y": 0.0},
            {"id": "C", "x": 5.0, "y": 5.0},
        ],
        "edges": [{"source": "A", "target": "B", "weight": 1}],
        "source": "A",
        "target": "C",
        "weighted": True,
        "directed": False,
        "mode": "graph",
    }
    output = AStarAlgorithm().run(build_input(payload))

    assert output.final_result["path_found"] is False
    assert output.timeline_steps[-1].event_type == "COMPLETE"


def test_astar_f_scores_non_decreasing_in_pop_order():
    output = AStarAlgorithm().run(build_input(COORDINATE_GRAPH_PAYLOAD))

    pop_f_scores = []
    for step in output.timeline_steps:
        if step.event_type == "POP_MIN":
            hvals = step.state_payload.get("heuristic_values", {})
            for entity in step.highlighted_entities:
                nid = str(entity.id)
                if nid in hvals:
                    pop_f_scores.append(hvals[nid]["f"])
                    break

    # f-scores of popped nodes should be non-decreasing (with consistent heuristic)
    for i in range(1, len(pop_f_scores)):
        assert pop_f_scores[i] >= pop_f_scores[i - 1] - 0.001, (
            f"f-score decreased: {pop_f_scores[i-1]} -> {pop_f_scores[i]}"
        )


def test_bellman_ford_finds_shortest_path_with_negative_weights():
    output = BellmanFordAlgorithm().run(build_input(NEGATIVE_WEIGHT_GRAPH_PAYLOAD))

    assert output.final_result["path_found"] is True
    assert output.final_result["negative_cycle_detected"] is False
    path = output.final_result["path"]
    assert path[0] == "S"
    assert path[-1] == "T"
    # S->A (4), A->B (-3), B->T (2) = cost 3
    assert output.final_result["path_cost"] == 3.0
    assert output.timeline_steps[0].event_type == "INITIALIZE"
    assert output.timeline_steps[-1].event_type == "PATH_FOUND"
    assert_common_metadata(output.algorithm_metadata, "graph", "bellman_ford")
    assert output.algorithm_metadata["time_complexity"] == "O(V * E)"


def test_bellman_ford_detects_negative_cycle():
    output = BellmanFordAlgorithm().run(build_input(NEGATIVE_CYCLE_GRAPH_PAYLOAD))

    assert output.final_result["negative_cycle_detected"] is True
    assert output.final_result["path_found"] is False

    # find the NEGATIVE_CYCLE_DETECTED event
    cycle_steps = [s for s in output.timeline_steps if s.event_type == "NEGATIVE_CYCLE_DETECTED"]
    assert len(cycle_steps) == 1
    assert cycle_steps[0].state_payload["negative_cycle"] is not None
    assert len(cycle_steps[0].state_payload["negative_cycle"]) > 0


def test_bellman_ford_disconnected():
    payload = {
        "nodes": [{"id": "S"}, {"id": "A"}, {"id": "T"}],
        "edges": [{"source": "S", "target": "A", "weight": 2}],
        "source": "S",
        "target": "T",
        "weighted": True,
        "directed": True,
        "mode": "graph",
    }
    output = BellmanFordAlgorithm().run(build_input(payload))

    assert output.final_result["path_found"] is False
    assert output.final_result["negative_cycle_detected"] is False
    assert output.timeline_steps[-1].event_type == "COMPLETE"


def test_bellman_ford_has_start_pass_events():
    output = BellmanFordAlgorithm().run(build_input(NEGATIVE_WEIGHT_GRAPH_PAYLOAD))

    pass_steps = [s for s in output.timeline_steps if s.event_type == "START_PASS"]
    # Should have V-1 passes (4 nodes -> 3 passes) + 1 detection pass
    assert len(pass_steps) >= 3


def test_prims_computes_mst():
    output = PrimsAlgorithm().run(build_input(MST_GRAPH_PAYLOAD))

    assert output.final_result["nodes_in_tree"] == 5
    assert output.final_result["total_weight"] == 11  # A-B(1) + B-C(2) + C-D(3) + C-E(5) = 11
    assert len(output.final_result["mst_edges"]) == 4  # V-1 edges
    assert output.timeline_steps[0].event_type == "INITIALIZE"
    assert output.timeline_steps[-1].event_type == "COMPLETE"
    assert_common_metadata(output.algorithm_metadata, "graph", "prims")
    assert output.algorithm_metadata["time_complexity"] == "O((V + E) log V)"

    # verify mst_edges in state_payload
    last_step = output.timeline_steps[-1]
    assert "mst_edges" in last_step.state_payload
    assert "mst_total_weight" in last_step.state_payload


def test_prims_single_node():
    payload = {
        "nodes": [{"id": "X"}],
        "edges": [],
        "source": "X",
        "weighted": True,
        "directed": False,
        "mode": "graph",
    }
    output = PrimsAlgorithm().run(build_input(payload))

    assert output.final_result["nodes_in_tree"] == 1
    assert output.final_result["total_weight"] == 0
    assert output.final_result["mst_edges"] == []


def test_prims_disconnected_graph():
    payload = {
        "nodes": [{"id": "A"}, {"id": "B"}, {"id": "C"}],
        "edges": [{"source": "A", "target": "B", "weight": 3}],
        "source": "A",
        "weighted": True,
        "directed": False,
        "mode": "graph",
    }
    output = PrimsAlgorithm().run(build_input(payload))

    # only spans the connected component containing source
    assert output.final_result["nodes_in_tree"] == 2
    assert output.final_result["total_weight"] == 3


def test_kruskals_computes_mst():
    output = KruskalsAlgorithm().run(build_input(MST_GRAPH_PAYLOAD))

    assert output.final_result["total_weight"] == 11  # same MST weight as Prim's
    assert len(output.final_result["mst_edges"]) == 4
    assert output.final_result["nodes_in_tree"] == 5
    assert output.timeline_steps[0].event_type == "INITIALIZE"
    assert output.timeline_steps[-1].event_type == "COMPLETE"
    assert_common_metadata(output.algorithm_metadata, "graph", "kruskals")
    assert output.algorithm_metadata["time_complexity"] == "O(E log E)"

    # verify mst_edges in state_payload
    last_step = output.timeline_steps[-1]
    assert "mst_edges" in last_step.state_payload


def test_kruskals_has_consider_and_reject_events():
    output = KruskalsAlgorithm().run(build_input(MST_GRAPH_PAYLOAD))

    event_types = [s.event_type for s in output.timeline_steps]
    assert "CONSIDER_EDGE" in event_types
    assert "ADD_TO_MST" in event_types
    # at least one edge should be rejected (more edges than V-1)
    assert "REJECT_CYCLE_EDGE" in event_types


def test_kruskals_single_node():
    payload = {
        "nodes": [{"id": "X"}],
        "edges": [],
        "source": "X",
        "weighted": True,
        "directed": False,
        "mode": "graph",
    }
    output = KruskalsAlgorithm().run(build_input(payload))

    assert output.final_result["total_weight"] == 0
    assert output.final_result["mst_edges"] == []
    assert output.final_result["nodes_in_tree"] == 1


def test_kruskals_disconnected_produces_forest():
    payload = {
        "nodes": [{"id": "A"}, {"id": "B"}, {"id": "C"}, {"id": "D"}],
        "edges": [
            {"source": "A", "target": "B", "weight": 2},
            {"source": "C", "target": "D", "weight": 3},
        ],
        "source": "A",
        "weighted": True,
        "directed": False,
        "mode": "graph",
    }
    output = KruskalsAlgorithm().run(build_input(payload))

    assert len(output.final_result["mst_edges"]) == 2
    assert output.final_result["total_weight"] == 5
    assert output.summary_metrics["components_remaining"] == 2


def test_topological_sort_produces_valid_ordering():
    output = TopologicalSortAlgorithm().run(build_input(DAG_PAYLOAD))

    ordering = output.final_result["ordering"]
    assert output.final_result["cycle_detected"] is False
    assert len(ordering) == 6
    # A must come before B and C
    assert ordering.index("A") < ordering.index("B")
    assert ordering.index("A") < ordering.index("C")
    # B and C must come before D
    assert ordering.index("B") < ordering.index("D")
    assert ordering.index("C") < ordering.index("D")
    # D and E must come before F
    assert ordering.index("D") < ordering.index("F")
    assert ordering.index("E") < ordering.index("F")

    assert output.timeline_steps[0].event_type == "INITIALIZE"
    assert output.timeline_steps[-1].event_type == "COMPLETE"
    assert_common_metadata(output.algorithm_metadata, "graph", "topological_sort")
    assert output.algorithm_metadata["time_complexity"] == "O(V + E)"

    # verify ordering in state_payload
    last_step = output.timeline_steps[-1]
    assert "ordering" in last_step.state_payload


def test_topological_sort_detects_cycle():
    output = TopologicalSortAlgorithm().run(build_input(CYCLIC_DIRECTED_GRAPH_PAYLOAD))

    assert output.final_result["cycle_detected"] is True
    assert len(output.final_result["ordering"]) < 4  # not all nodes ordered

    cycle_steps = [s for s in output.timeline_steps if s.event_type == "CYCLE_DETECTED"]
    assert len(cycle_steps) == 1
    assert cycle_steps[0].state_payload["cycle_detected"] is True
    assert len(cycle_steps[0].state_payload["cycle_nodes"]) > 0


def test_topological_sort_single_node():
    payload = {
        "nodes": [{"id": "X"}],
        "edges": [],
        "weighted": False,
        "directed": True,
        "mode": "graph",
    }
    output = TopologicalSortAlgorithm().run(build_input(payload))

    assert output.final_result["ordering"] == ["X"]
    assert output.final_result["cycle_detected"] is False


def test_topological_sort_has_enqueue_and_dequeue_events():
    output = TopologicalSortAlgorithm().run(build_input(DAG_PAYLOAD))

    event_types = [s.event_type for s in output.timeline_steps]
    assert "ENQUEUE_ZERO" in event_types
    assert "DEQUEUE" in event_types
    assert "DECREMENT_INDEGREE" in event_types


def test_topological_sort_rejects_undirected_graph():
    payload = {**DAG_PAYLOAD, "directed": False}
    with pytest.raises(DomainError, match = "directed graph"):
        TopologicalSortAlgorithm().run(build_input(payload))
