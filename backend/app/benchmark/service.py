import random
import statistics
import time

from app.simulation import registry
from app.simulation.types import AlgorithmInput

import app.algorithms.sorting 


_METRIC_TABLE_PREFIX = {
    "runtime_ms": "runtime",
    "comparisons": "comparisons",
    "swaps": "swaps",
    "writes": "writes",
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


def _aggregate_metric(trial_metrics: list[dict], metric_key: str) -> dict:
    values = [t.get(metric_key, 0) for t in trial_metrics]
    return {
        "mean": round(statistics.mean(values), 4),
        "median": round(statistics.median(values), 4),
        "stddev": round(statistics.stdev(values), 4) if len(values) > 1 else 0.0,
        "min": round(min(values), 4),
        "max": round(max(values), 4),
    }


def run_benchmark(module_type: str, config: dict) -> dict:
    algorithm_keys = config["algorithm_keys"]
    input_family = config["input_family"]
    sizes = config["sizes"]
    trials_per_size = config["trials_per_size"]
    metrics = config["metrics"]

    t_start = time.perf_counter()


    series_data: dict[str, dict[str, list]] = {}
    for metric_key in metrics:
        series_data[metric_key] = {algo_key: [] for algo_key in algorithm_keys}

    table = []

    for algo_key in algorithm_keys:
        algorithm = registry.get_algorithm(module_type, algo_key)

        for size in sizes:
            trial_results = []

            for _ in range(trials_per_size):
                arr = generate_sorting_input(input_family, size)

                algo_input = AlgorithmInput(
                    input_payload = {"array": arr},
                    execution_mode = "benchmark",
                    explanation_level = "none",
                )

                output = algorithm.run(algo_input)
                trial_results.append(output.summary_metrics)


            aggregated = {}
            for metric_key in metrics:
                aggregated[metric_key] = _aggregate_metric(trial_results, metric_key)


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
        "total_runs": len(algorithm_keys) * len(sizes) * trials_per_size,
        "input_family": input_family,
        "elapsed_ms": elapsed_ms,
    }

    return {
        "series": series,
        "table": table,
        "summary": summary,
    }
