import random
import statistics
import time
from collections.abc import Callable

from app.observability import get_logger, compact_context, summarize_benchmark_config, summarize_summary_metrics
from app.simulation import registry
from app.simulation.types import AlgorithmInput

import app.algorithms.sorting
import app.algorithms.graph
from app.benchmark.graph_inputs import generate_graph_input

logger = get_logger("benchmark.service")


_METRIC_TABLE_PREFIX = {
    "runtime_ms": "runtime",
    "comparisons": "comparisons",
    "swaps": "swaps",
    "writes": "writes",
    "nodes_visited": "nodes_visited",
    "edges_explored": "edges_explored",
    "max_structure_size": "max_structure_size",
    "relaxations": "relaxations",
    "edges_considered": "edges_considered",
    "edges_added": "edges_added",
    "mst_total_weight": "mst_total_weight",
    "nodes_ordered": "nodes_ordered",
    "edges_processed": "edges_processed",
}


_GRAPH_METRIC_MAP = {
    ("bfs", "nodes_visited"): "nodes_visited",
    ("bfs", "edges_explored"): "edges_explored",
    ("bfs", "max_structure_size"): "frontier_size",
    ("dfs", "nodes_visited"): "nodes_visited",
    ("dfs", "edges_explored"): "edges_explored",
    ("dfs", "max_structure_size"): "stack_max_size",
    ("dijkstra", "nodes_visited"): "nodes_visited",
    ("dijkstra", "edges_explored"): "edges_explored",
    ("dijkstra", "relaxations"): "relaxations",
    ("astar", "nodes_visited"): "nodes_visited",
    ("astar", "edges_explored"): "edges_explored",
    ("astar", "relaxations"): None,
    ("bellman_ford", "nodes_visited"): None,
    ("bellman_ford", "edges_explored"): "edges_processed",
    ("bellman_ford", "relaxations"): "relaxation_count",
    ("prims", "edges_considered"): None,
    ("prims", "edges_added"): "edges_added",
    ("prims", "mst_total_weight"): "mst_total_weight",
    ("kruskals", "edges_considered"): "edges_considered",
    ("kruskals", "edges_added"): "edges_added",
    ("kruskals", "mst_total_weight"): "mst_total_weight",
    ("topological_sort", "nodes_ordered"): "nodes_ordered",
    ("topological_sort", "edges_processed"): "edges_processed",
}


def generate_sorting_input(family: str, size: int) -> list[int]:
    if family == "random":
        return [random.randint(1, size * 10) for _ in range(size)]
    
    elif family == "sorted":
        return list(range(1, size + 1))
    
    elif family == "reversed":
        return list(range(size, 0, -1))
    
    elif family == "nearly_sorted":
        arr = list(range(1, size + 1))
        swap_count = max(1, size // 20)
        
        for _ in range(swap_count):
            i = random.randint(0, size - 2)
            j = random.randint(i + 1, size - 1)
            arr[i], arr[j] = arr[j], arr[i]
            
        return arr
    
    else:
        raise ValueError(f"Unknown input family: {family}")


def _resolve_metric_key(module_type, algo_key, benchmark_metric):
    if benchmark_metric == "runtime_ms":
        return "runtime_ms"
    if module_type == "sorting":
        return benchmark_metric
    return _GRAPH_METRIC_MAP.get((algo_key, benchmark_metric))


def _null_aggregate():
    return {"mean": None, "median": None, "stddev": None, "min": None, "max": None}


def _generate_input(module_type, config, size):
    if module_type == "sorting":
        arr = generate_sorting_input(config["input_family"], size)
        return {"array": arr}
    elif module_type == "graph":
        return generate_graph_input(
            config["input_family"], size, config["category"], config["algorithm_keys"]
        )
    else:
        raise ValueError(f"Unknown module type: {module_type}")


def _aggregate_metric(trial_metrics: list[dict], metric_key: str) -> dict:
    values = [t.get(metric_key, 0) for t in trial_metrics]
    return {
        "mean": round(statistics.mean(values), 4),
        "median": round(statistics.median(values), 4),
        "stddev": round(statistics.stdev(values), 4) if len(values) > 1 else 0.0,
        "min": round(min(values), 4),
        "max": round(max(values), 4),
    }


def run_benchmark(module_type: str, config: dict, benchmark_id: int | None = None, progress_callback: Callable[[int, int], None] | None = None) -> dict:
    algorithm_keys = config["algorithm_keys"]
    input_family = config["input_family"]
    sizes = config["sizes"]
    trials_per_size = config["trials_per_size"]
    metrics = config["metrics"]

    total_runs = len(algorithm_keys) * len(sizes) * trials_per_size
    completed_runs = 0

    t_start = time.perf_counter()

    logger.info(
        "benchmark.execution.started %s",
        compact_context(
            benchmark_id = benchmark_id,
            module_type = module_type,
            **summarize_benchmark_config(config),
        ),
    )


    series_data: dict[str, dict[str, list]] = {}
    for metric_key in metrics:
        series_data[metric_key] = {algo_key: [] for algo_key in algorithm_keys}

    table = []

    for algo_key in algorithm_keys:
        algorithm = registry.get_algorithm(module_type, algo_key)

        for size in sizes:
            trial_results = []

            for _ in range(trials_per_size):
                input_payload = _generate_input(module_type, config, size)

                algo_input = AlgorithmInput(
                    input_payload = input_payload,
                    execution_mode = "benchmark",
                    explanation_level = "none",
                )

                t0 = time.perf_counter()
                output = algorithm.run(algo_input)
                t1 = time.perf_counter()
                raw_metrics = dict(output.summary_metrics)
                raw_metrics["runtime_ms"] = round((t1 - t0) * 1000, 3)
                trial_results.append(raw_metrics)

            completed_runs += trials_per_size

            if progress_callback is not None:
                progress_callback(completed_runs, total_runs)

            aggregated = {}
            for metric_key in metrics:
                resolved = _resolve_metric_key(module_type, algo_key, metric_key)
                if resolved is not None:
                    aggregated[metric_key] = _aggregate_metric(trial_results, resolved)
                else:
                    aggregated[metric_key] = _null_aggregate()


            for metric_key in metrics:
                point = {"size": size, **aggregated[metric_key]}
                series_data[metric_key][algo_key].append(point)


            row = {"algorithm_key": algo_key, "size": size}
            for metric_key in metrics:
                prefix = _METRIC_TABLE_PREFIX.get(metric_key, metric_key)
                row[f"{prefix}_mean"] = aggregated[metric_key]["mean"]
                row[f"{prefix}_median"] = aggregated[metric_key]["median"]
                
            table.append(row)


    series = {}
    for metric_key in metrics:
        series[metric_key] = [
            {
                "algorithm_key": algo_key,
                "points": series_data[metric_key][algo_key],
            }
            for algo_key in algorithm_keys
        ]

    t_end = time.perf_counter()
    elapsed_ms = round((t_end - t_start) * 1000, 2)

    summary = {
        "total_algorithms": len(algorithm_keys),
        "total_sizes": len(sizes),
        "trials_per_size": trials_per_size,
        "total_runs": total_runs,
        "input_family": input_family,
        "elapsed_ms": elapsed_ms,
    }

    logger.info(
        "benchmark.execution.completed %s",
        compact_context(
            benchmark_id = benchmark_id,
            module_type = module_type,
            summary = summarize_summary_metrics(summary),
            table_rows = len(table),
        ),
    )

    return {
        "series": series,
        "table": table,
        "summary": summary,
    }
