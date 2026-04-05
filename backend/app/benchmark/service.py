import random
import statistics
import time
from collections.abc import Callable

from app.config import settings
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


_SORTING_METRIC_MAP = {
    ("quicksort", "comparisons"):       "comparisons",
    ("quicksort", "swaps"):             "swaps",
    ("quicksort", "writes"):            "writes",
    ("mergesort", "comparisons"):       "comparisons",
    ("mergesort", "swaps"):             "swaps",
    ("mergesort", "writes"):            "writes",
    ("bubble_sort", "comparisons"):     "comparisons",
    ("bubble_sort", "swaps"):           "swaps",
    ("bubble_sort", "writes"):          None,
    ("insertion_sort", "comparisons"):  "comparisons",
    ("insertion_sort", "swaps"):        "shifts",
    ("insertion_sort", "writes"):       "writes",
    ("selection_sort", "comparisons"):  "comparisons",
    ("selection_sort", "swaps"):        "swaps",
    ("selection_sort", "writes"):       None,
    ("heap_sort", "comparisons"):       "comparisons",
    ("heap_sort", "swaps"):             "swaps",
    ("heap_sort", "writes"):            None,
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
        return _SORTING_METRIC_MAP.get((algo_key, benchmark_metric))
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


def _is_cancelled(benchmark_id, redis_conn):
    """Check if a benchmark has been cancelled via Redis signal."""
    if redis_conn is None or benchmark_id is None:
        return False
    return redis_conn.exists(f"benchmark:{benchmark_id}:cancel")


def _run_single_algorithm(module_type, algo_key, sizes, inputs_by_size, trials_per_size, metrics_list, benchmark_id = None):
    """Run all sizes x trials for one algorithm in a subprocess. Returns partial results."""
    import app.algorithms.sorting
    import app.algorithms.graph

    # Connect to Redis for cancel detection (fail-open if unavailable)
    redis_conn = None
    if benchmark_id is not None and settings.use_redis:
        try:
            from app.worker.connection import get_redis
            redis_conn = get_redis()
        except Exception:
            pass

    def _check_cancel():
        return redis_conn is not None and redis_conn.exists(f"benchmark:{benchmark_id}:cancel")

    algorithm = registry.get_algorithm(module_type, algo_key)
    series_points = {metric: [] for metric in metrics_list}
    table_rows = []

    for size in sizes:
        if _check_cancel():
            break

        trial_metrics = []
        for trial_idx in range(trials_per_size):
            if _check_cancel():
                break

            input_payload = inputs_by_size[size][trial_idx]
            if module_type == "sorting":
                input_payload = {"array": list(input_payload["array"])}

            algo_input = AlgorithmInput(
                input_payload = input_payload,
                execution_mode = "benchmark",
                explanation_level = "none",
            )

            t0 = time.perf_counter()
            output = algorithm.run(algo_input)
            t1 = time.perf_counter()

            raw = dict(output.summary_metrics)
            raw["runtime_ms"] = round((t1 - t0) * 1000, 3)
            trial_metrics.append(raw)

        # Skip aggregation if cancelled mid-trial (incomplete data)
        if _check_cancel():
            break

        # Aggregate metrics for this algo x size
        aggregated = {}
        for metric_key in metrics_list:
            resolved = _resolve_metric_key(module_type, algo_key, metric_key)
            if resolved is not None:
                aggregated[metric_key] = _aggregate_metric(trial_metrics, resolved)
            else:
                aggregated[metric_key] = _null_aggregate()

        for metric_key in metrics_list:
            point = {"size": size, **aggregated[metric_key]}
            series_points[metric_key].append(point)

        row = {"algorithm_key": algo_key, "size": size}
        for metric_key in metrics_list:
            prefix = _METRIC_TABLE_PREFIX.get(metric_key, metric_key)
            row[f"{prefix}_mean"] = aggregated[metric_key]["mean"]
            row[f"{prefix}_median"] = aggregated[metric_key]["median"]
        table_rows.append(row)

    return {"algo_key": algo_key, "series": series_points, "table": table_rows}


def run_benchmark(module_type: str, config: dict, benchmark_id: int | None = None, progress_callback: Callable[[int, int], None] | None = None, redis_conn = None, db_job_updater: Callable | None = None) -> dict:
    import os
    from concurrent.futures import ProcessPoolExecutor, wait, FIRST_COMPLETED

    algorithm_keys = config["algorithm_keys"]
    input_family = config["input_family"]
    sizes = config["sizes"]
    trials_per_size = config["trials_per_size"]
    metrics = config["metrics"]

    total_runs = len(algorithm_keys) * len(sizes) * trials_per_size

    t_start = time.perf_counter()

    logger.info(
        "benchmark.execution.started %s",
        compact_context(
            benchmark_id = benchmark_id,
            module_type = module_type,
            **summarize_benchmark_config(config),
        ),
    )

    # Pre-generate all inputs — shared across algorithms for fairness
    inputs_by_size = {}
    for size in sizes:
        inputs_by_size[size] = [
            _generate_input(module_type, config, size)
            for _ in range(trials_per_size)
        ]

    # Run algorithms in parallel
    if settings.use_redis:
        worker_count = min(len(algorithm_keys), os.cpu_count() or 4)
    else:
        worker_count = 1  # Single process on free tier to conserve memory

    all_series: dict[str, list] = {m: [] for m in metrics}
    all_table: list[dict] = []
    completed_algos = 0

    with ProcessPoolExecutor(max_workers = worker_count) as executor:
        futures = {
            executor.submit(
                _run_single_algorithm,
                module_type, algo_key, sizes, inputs_by_size, trials_per_size, metrics,
                benchmark_id,
            ): algo_key
            for algo_key in algorithm_keys
        }

        cancelled = False
        pending = set(futures.keys())

        while pending:
            # Wait up to 2s for any future to complete, then check cancellation
            done, pending = wait(pending, timeout = 2.0, return_when = FIRST_COMPLETED)

            for future in done:
                algo_result = future.result()
                completed_algos += 1

                # Merge this algorithm's results (may be partial if cancelled)
                for metric_key in metrics:
                    points = algo_result["series"][metric_key]
                    if points:
                        all_series[metric_key].append({
                            "algorithm_key": algo_result["algo_key"],
                            "points": points,
                        })
                if algo_result["table"]:
                    all_table.extend(algo_result["table"])

                # Progress callback
                if progress_callback is not None:
                    completed_runs = completed_algos * len(sizes) * trials_per_size
                    progress_callback(completed_runs, total_runs)

                # Progressive update — write partial results to DB
                if db_job_updater is not None:
                    partial = {"series": dict(all_series), "table": list(all_table)}
                    progress = completed_algos / len(algorithm_keys)
                    db_job_updater(partial, progress)

            # Check cancellation every 2s or after each algorithm completes
            if not cancelled and _is_cancelled(benchmark_id, redis_conn):
                cancelled = True
                # Subprocesses detect cancel via Redis independently

    if cancelled and redis_conn is not None:
        redis_conn.delete(f"benchmark:{benchmark_id}:cancel")

    t_end = time.perf_counter()
    elapsed_ms = round((t_end - t_start) * 1000, 2)

    summary = {
        "total_algorithms": len(algorithm_keys),
        "total_sizes": len(sizes),
        "trials_per_size": trials_per_size,
        "total_runs": total_runs,
        "input_family": input_family,
        "elapsed_ms": elapsed_ms,
        "cancelled": cancelled,
    }

    logger.info(
        "benchmark.execution.completed %s",
        compact_context(
            benchmark_id = benchmark_id,
            module_type = module_type,
            summary = summarize_summary_metrics(summary),
            table_rows = len(all_table),
        ),
    )

    return {
        "series": all_series,
        "table": all_table,
        "summary": summary,
    }
