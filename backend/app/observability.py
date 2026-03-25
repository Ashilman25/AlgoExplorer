import logging
from typing import Any


APP_LOGGER_NAME = "algo_explorer"
_LOG_FORMAT = "%(asctime)s | %(levelname)s | %(name)s | %(message)s"


def configure_logging(level_name: str | None = None) -> None:
    level = _resolve_log_level(level_name)
    root_logger = logging.getLogger()

    if not getattr(configure_logging, "_configured", False):
        logging.basicConfig(level = level, format = _LOG_FORMAT)
        configure_logging._configured = True

    root_logger.setLevel(level)
    logging.getLogger(APP_LOGGER_NAME).setLevel(level)


def get_logger(component: str) -> logging.Logger:
    component = component.strip(".")
    if not component:
        return logging.getLogger(APP_LOGGER_NAME)

    return logging.getLogger(f"{APP_LOGGER_NAME}.{component}")


def compact_context(**context: Any) -> dict[str, Any]:
    return {key: value for key, value in context.items() if value is not None}


def request_context(request) -> dict[str, Any]:
    query = request.url.query or None
    return compact_context(
        method = request.method,
        path = request.url.path,
        query = query,
    )


def summarize_input_payload(module_type: str, algorithm_key: str, input_payload: dict[str, Any]) -> dict[str, Any]:
    if module_type == "graph":
        nodes = _as_list(input_payload.get("nodes"))
        edges = _as_list(input_payload.get("edges"))
        weighted_edges = sum(1 for edge in edges if isinstance(edge, dict) and edge.get("weight") is not None)

        return compact_context(
            node_count = len(nodes),
            edge_count = len(edges),
            weighted_edge_count = weighted_edges,
            source = input_payload.get("source"),
            target = input_payload.get("target"),
        )

    if module_type == "sorting":
        arr = _as_list(input_payload.get("array"))
        return compact_context(
            array_length = len(arr),
            animation_max_size = input_payload.get("animation_max_size"),
            min_value = _safe_min(arr),
            max_value = _safe_max(arr),
        )

    if module_type == "dp":
        if "string1" in input_payload or "string2" in input_payload:
            string1 = input_payload.get("string1")
            string2 = input_payload.get("string2")
            string1_length = len(string1) if isinstance(string1, str) else None
            string2_length = len(string2) if isinstance(string2, str) else None
            return compact_context(
                string1_length = string1_length,
                string2_length = string2_length,
                table_cells = _dp_table_cells(string1_length, string2_length),
            )

        if "items" in input_payload and "capacity" in input_payload:
            items = _as_list(input_payload.get("items"))
            return compact_context(
                item_count = len(items),
                capacity = input_payload.get("capacity"),
            )

        if "coins" in input_payload and "target" in input_payload:
            coins = _as_list(input_payload.get("coins"))
            return compact_context(
                coin_count = len(coins),
                target = input_payload.get("target"),
            )

        if "n" in input_payload:
            return compact_context(n = input_payload.get("n"))

    return compact_context(
        algorithm_key = algorithm_key,
        payload_keys = sorted(input_payload.keys()),
    )


def summarize_algorithm_config(algorithm_config: dict[str, Any] | None) -> dict[str, Any]:
    if not algorithm_config:
        return {}

    return {"algorithm_config_keys": sorted(algorithm_config.keys())}


def summarize_summary_metrics(summary_metrics: dict[str, Any]) -> dict[str, Any]:
    scalar_metrics: dict[str, Any] = {}

    for key, value in summary_metrics.items():
        if value is None or isinstance(value, (bool, int, float)):
            scalar_metrics[key] = value
        elif isinstance(value, str):
            scalar_metrics[key] = value[:120]

    if len(scalar_metrics) != len(summary_metrics):
        scalar_metrics["metric_keys"] = sorted(summary_metrics.keys())

    return scalar_metrics


def summarize_benchmark_config(config: dict[str, Any]) -> dict[str, Any]:
    sizes = config.get("sizes", [])
    algorithm_keys = config.get("algorithm_keys", [])
    metrics = config.get("metrics", [])

    return compact_context(
        algorithm_keys = algorithm_keys,
        algorithm_count = len(algorithm_keys),
        size_count = len(sizes),
        size_min = min(sizes) if sizes else None,
        size_max = max(sizes) if sizes else None,
        trials_per_size = config.get("trials_per_size"),
        input_family = config.get("input_family"),
        metrics = metrics,
    )


def _resolve_log_level(level_name: str | None) -> int:
    if not level_name:
        return logging.INFO

    return getattr(logging, level_name.upper(), logging.INFO)


def _as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _safe_min(values: list[Any]) -> Any:
    if not values:
        return None

    try:
        return min(values)
    except (TypeError, ValueError):
        return None


def _safe_max(values: list[Any]) -> Any:
    if not values:
        return None

    try:
        return max(values)
    except (TypeError, ValueError):
        return None


def _dp_table_cells(string1_length: int | None, string2_length: int | None) -> int | None:
    if string1_length is None or string2_length is None:
        return None

    return (string1_length + 1) * (string2_length + 1)
