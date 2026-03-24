import re

import pytest

from app.algorithms.dp.edit_distance import EditDistanceAlgorithm
from app.algorithms.dp.lcs import LCSAlgorithm
from app.algorithms.graph.bfs import BFSAlgorithm
from app.algorithms.graph.dijkstra import DijkstraAlgorithm
from app.algorithms.sorting.mergesort import MergeSortAlgorithm
from app.algorithms.sorting.quicksort import QuickSortAlgorithm
from app.exceptions import DomainError
from app.simulation.types import AlgorithmInput
from app.validators import (
    validate_array_payload,
    validate_dp_payload,
    validate_graph_payload,
    validate_module_algorithm,
)


EXPECTED_STEP_KEYS = {
    "step_index",
    "event_type",
    "state_payload",
    "highlighted_entities",
    "metrics_snapshot",
    "explanation",
    "timestamp_or_order",
}


TIMELINE_CASES = [
    (
        BFSAlgorithm,
        {
            "nodes": [{"id": "A"}, {"id": "B"}, {"id": "C"}],
            "edges": [{"source": "A", "target": "B"}, {"source": "B", "target": "C"}],
            "source": "A",
            "target": "C",
            "weighted": False,
            "directed": False,
            "mode": "graph",
        },
    ),
    (
        DijkstraAlgorithm,
        {
            "nodes": [{"id": "S"}, {"id": "A"}, {"id": "T"}],
            "edges": [
                {"source": "S", "target": "A", "weight": 2},
                {"source": "A", "target": "T", "weight": 1},
                {"source": "S", "target": "T", "weight": 10},
            ],
            "source": "S",
            "target": "T",
            "weighted": True,
            "directed": False,
            "mode": "graph",
        },
    ),
    (
        QuickSortAlgorithm,
        {
            "array": [3, 1, 2],
            "preset": "custom",
            "duplicate_density": "none",
            "animation_max_size": 200,
        },
    ),
    (
        MergeSortAlgorithm,
        {
            "array": [3, 1, 2],
            "preset": "custom",
            "duplicate_density": "none",
            "animation_max_size": 200,
        },
    ),
    (LCSAlgorithm, {"string1": "ABC", "string2": "AC"}),
    (EditDistanceAlgorithm, {"string1": "cat", "string2": "cut"}),
]


def build_input(payload: dict) -> AlgorithmInput:
    return AlgorithmInput(
        input_payload=payload,
        execution_mode="simulate",
        explanation_level="standard",
    )


@pytest.mark.parametrize(("algorithm_cls", "payload"), TIMELINE_CASES)
def test_generated_timelines_follow_shared_step_contract(algorithm_cls, payload):
    output = algorithm_cls().run(build_input(payload))

    assert output.timeline_steps

    for index, step in enumerate(output.timeline_steps):
        dumped = step.model_dump()
        assert set(dumped) == EXPECTED_STEP_KEYS
        assert dumped["step_index"] == index
        assert dumped["timestamp_or_order"] == index
        assert isinstance(dumped["event_type"], str)
        assert dumped["event_type"]
        assert isinstance(dumped["state_payload"], dict)
        assert isinstance(dumped["highlighted_entities"], list)
        assert isinstance(dumped["metrics_snapshot"], dict)

        for entity in dumped["highlighted_entities"]:
            assert "id" in entity
            assert "state" in entity
            assert isinstance(entity["state"], str)
            assert entity["state"]


def test_validate_module_algorithm_accepts_supported_pairs():
    validate_module_algorithm("graph", "bfs")
    validate_module_algorithm("sorting", "quicksort")
    validate_module_algorithm("dp", "edit_distance")


@pytest.mark.parametrize(
    ("module_type", "algorithm_key", "message"),
    [
        ("missing", "bfs", "Module 'missing' not found in Registry"),
        ("graph", "missing", "Algorithm 'missing' not found in 'graph' module"),
    ],
)
def test_validate_module_algorithm_rejects_unknown_pairs(
    module_type, algorithm_key, message
):
    with pytest.raises(DomainError, match=re.escape(message)):
        validate_module_algorithm(module_type, algorithm_key)


def test_validate_graph_payload_accepts_valid_graph():
    validate_graph_payload(
        {
            "nodes": [{"id": "A"}, {"id": "B"}],
            "edges": [{"source": "A", "target": "B", "weight": 1}],
            "source": "A",
            "target": "B",
            "weighted": True,
            "directed": False,
            "mode": "graph",
        }
    )


@pytest.mark.parametrize(
    ("payload", "message"),
    [
        (
            {
                "nodes": [{"id": "A"}, {"id": "A"}],
                "edges": [],
                "source": "A",
                "target": "A",
            },
            "duplicate id",
        ),
        (
            {
                "nodes": [{"id": "A"}, {"id": "B"}],
                "edges": [{"source": "A", "target": "B", "weight": -1}],
                "source": "A",
                "target": "B",
            },
            "must not be negative",
        ),
        (
            {
                "nodes": [{"id": "A"}, {"id": "B"}],
                "edges": [{"source": "A", "target": "B"}],
                "source": "Z",
                "target": "B",
            },
            "does not reference a valid node",
        ),
    ],
)
def test_validate_graph_payload_rejects_invalid_graphs(payload, message):
    with pytest.raises(DomainError, match=message):
        validate_graph_payload(payload)


def test_validate_array_payload_accepts_valid_sorting_input():
    validate_array_payload(
        {
            "array": [3, 1, 2],
            "preset": "custom",
            "duplicate_density": "none",
            "animation_max_size": 200,
        }
    )


@pytest.mark.parametrize(
    ("payload", "message"),
    [
        (
            {
                "array": [1],
                "preset": "custom",
                "duplicate_density": "none",
                "animation_max_size": 200,
            },
            "at least 2 elements",
        ),
        (
            {
                "array": list(range(201)),
                "preset": "custom",
                "duplicate_density": "none",
                "animation_max_size": 200,
            },
            "exceeds animation limit",
        ),
    ],
)
def test_validate_array_payload_rejects_invalid_arrays(payload, message):
    with pytest.raises(DomainError, match=message):
        validate_array_payload(payload)


def test_validate_dp_payload_accepts_valid_strings():
    validate_dp_payload("lcs", {"string1": "ABC", "string2": "AC"})
    validate_dp_payload("edit_distance", {"string1": "cat", "string2": "cut"})


@pytest.mark.parametrize(
    ("algorithm_key", "payload", "message"),
    [
        (
            "lcs",
            {"string1": "", "string2": ""},
            "At least one string must be non-empty",
        ),
        (
            "edit_distance",
            {"string1": "A" * 50, "string2": "B" * 50},
            "exceeds visualization limit",
        ),
    ],
)
def test_validate_dp_payload_rejects_invalid_inputs(algorithm_key, payload, message):
    with pytest.raises(DomainError, match=message):
        validate_dp_payload(algorithm_key, payload)
