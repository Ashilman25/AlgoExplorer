import asyncio
import logging
from datetime import datetime

from starlette.requests import Request

import app.benchmark.service as benchmark_service
import app.simulation.orchestrator as orchestrator
from app.benchmark.service import run_benchmark
from app.main import unexpected_error_handler
from app.observability import summarize_benchmark_config, summarize_input_payload
from app.schemas.runs import CreateRunRequest
from app.schemas.timeline import TimelineStep
from app.simulation.types import AlgorithmOutput


class FakeRunDb:
    def __init__(self):
        self.added = None

    def add(self, model):
        self.added = model

    def commit(self):
        return None

    def refresh(self, model):
        model.id = 17
        model.created_at = datetime(2026, 1, 1, 12, 0, 0)


class FakeSimulationAlgorithm:
    def run(self, _algo_input):
        return AlgorithmOutput(
            timeline_steps = [
                TimelineStep(
                    step_index = 0,
                    event_type = "visit",
                    state_payload = {"visited": ["A"]},
                    highlighted_entities = [],
                    metrics_snapshot = {"visited_count": 1},
                    explanation = "Visit A",
                    timestamp_or_order = 0,
                )
            ],
            final_result = {"result": [1, 2, 3]},
            summary_metrics = {"runtime_ms": 1.5, "comparisons": 4, "swaps": 2},
            algorithm_metadata = {"algorithm_key": "quicksort"},
        )


class FakeBenchmarkAlgorithm:
    def run(self, algo_input):
        array_length = len(algo_input.input_payload["array"])
        return AlgorithmOutput(
            timeline_steps = [],
            final_result = {"sorted": sorted(algo_input.input_payload["array"])},
            summary_metrics = {
                "runtime_ms": round(array_length / 10, 2),
                "comparisons": array_length * 2,
                "swaps": array_length,
            },
            algorithm_metadata = {"mode": algo_input.execution_mode},
        )


def test_summarize_input_payload_avoids_raw_frontend_payloads():
    graph_summary = summarize_input_payload(
        "graph",
        "dijkstra",
        {
            "nodes": [{"id": "A"}, {"id": "B"}, {"id": "C"}],
            "edges": [
                {"source": "A", "target": "B", "weight": 3},
                {"source": "B", "target": "C"},
            ],
            "source": "A",
            "target": "C",
        },
    )
    assert graph_summary == {
        "node_count": 3,
        "edge_count": 2,
        "weighted_edge_count": 1,
        "source": "A",
        "target": "C",
    }

    sorting_summary = summarize_input_payload(
        "sorting",
        "quicksort",
        {"array": [9, 1, 4, 7], "animation_max_size": 200},
    )
    assert sorting_summary == {
        "array_length": 4,
        "animation_max_size": 200,
        "min_value": 1,
        "max_value": 9,
    }

    dp_summary = summarize_input_payload(
        "dp",
        "edit_distance",
        {"string1": "kitten", "string2": "sitting"},
    )
    assert dp_summary == {
        "string1_length": 6,
        "string2_length": 7,
        "table_cells": 56,
    }


def test_summarize_input_payload_tolerates_invalid_shapes_for_logging():
    summary = summarize_input_payload(
        "sorting",
        "quicksort",
        {"array": [7, "bad", 2], "animation_max_size": "oops"},
    )

    assert summary == {
        "array_length": 3,
        "animation_max_size": "oops",
    }


def test_summarize_benchmark_config_reports_counts_and_ranges():
    summary = summarize_benchmark_config(
        {
            "algorithm_keys": ["quicksort", "mergesort"],
            "input_family": "random",
            "sizes": [25, 100, 500],
            "trials_per_size": 5,
            "metrics": ["runtime_ms", "comparisons"],
        }
    )

    assert summary == {
        "algorithm_keys": ["quicksort", "mergesort"],
        "algorithm_count": 2,
        "size_count": 3,
        "size_min": 25,
        "size_max": 500,
        "trials_per_size": 5,
        "input_family": "random",
        "metrics": ["runtime_ms", "comparisons"],
    }


def test_run_simulation_logs_execution_summary_and_persisted_run(caplog, monkeypatch):
    monkeypatch.setattr(orchestrator, "validate_module_algorithm", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(orchestrator, "_validate_payload", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(orchestrator.registry, "is_registered", lambda *_args, **_kwargs: True)
    monkeypatch.setattr(orchestrator.registry, "get_algorithm", lambda *_args, **_kwargs: FakeSimulationAlgorithm())

    request = CreateRunRequest(
        module_type = "sorting",
        algorithm_key = "quicksort",
        input_payload = {"array": [9, 1, 4, 7], "animation_max_size": 200},
        algorithm_config = {"pivot_strategy": "last"},
        execution_mode = "simulate",
        explanation_level = "standard",
        scenario_id = 9,
    )

    caplog.set_level(logging.INFO, logger = "algo_explorer.simulation.orchestrator")
    response = orchestrator.run_simulation(request, FakeRunDb())

    messages = [record.getMessage() for record in caplog.records]
    assert any("algorithm.execution.started" in message for message in messages)
    assert any("algorithm.execution.completed" in message for message in messages)
    assert any("run.create.persisted" in message for message in messages)
    assert response.id == 17
    assert response.timeline_available is True


def test_run_benchmark_logs_lifecycle_summary(caplog, monkeypatch):
    monkeypatch.setattr(benchmark_service.registry, "get_algorithm", lambda *_args, **_kwargs: FakeBenchmarkAlgorithm())
    monkeypatch.setattr(benchmark_service, "generate_sorting_input", lambda _family, size: list(range(size, 0, -1)))

    config = {
        "algorithm_keys": ["quicksort", "mergesort"],
        "input_family": "random",
        "sizes": [10, 20],
        "trials_per_size": 2,
        "metrics": ["runtime_ms", "comparisons", "swaps"],
    }

    caplog.set_level(logging.INFO, logger = "algo_explorer.benchmark.service")
    result = run_benchmark("sorting", config, benchmark_id = 7)

    messages = [record.getMessage() for record in caplog.records]
    assert any("benchmark.execution.started" in message for message in messages)
    assert any("benchmark.execution.completed" in message for message in messages)
    assert result["summary"]["total_runs"] == 8
    assert len(result["table"]) == 4


def test_unexpected_error_handler_logs_request_context(caplog):
    request = Request(
        {
            "type": "http",
            "method": "GET",
            "scheme": "http",
            "http_version": "1.1",
            "path": "/api/test-crash",
            "root_path": "",
            "query_string": b"source=e2e",
            "server": ("testserver", 80),
            "client": ("127.0.0.1", 50000),
            "headers": [],
        }
    )
    exc = RuntimeError("boom")

    caplog.set_level(logging.ERROR, logger = "algo_explorer.main")
    response = asyncio.run(unexpected_error_handler(request, exc))

    messages = [record.getMessage() for record in caplog.records]
    assert any("request.unhandled_error" in message for message in messages)
    assert any("/api/test-crash" in message for message in messages)
    assert response.status_code == 500
