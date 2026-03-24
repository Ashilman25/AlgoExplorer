import pytest

from app.algorithms.graph.bfs import BFSAlgorithm
from app.algorithms.graph.dijkstra import DijkstraAlgorithm
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
