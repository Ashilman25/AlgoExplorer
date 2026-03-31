import math
from typing import Any, Literal
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict, field_validator, model_validator

BENCHMARK_MODULE_TYPES = {"sorting", "graph"}

BENCHMARK_CATEGORIES = {
    "graph": {
        "traversal":     ["bfs", "dfs"],
        "shortest_path": ["dijkstra", "astar", "bellman_ford"],
        "mst":           ["prims", "kruskals"],
        "ordering":      ["topological_sort"],
    },
}

BENCHMARK_ALGORITHMS = {
    "sorting": {"quicksort", "mergesort", "bubble_sort", "insertion_sort",
                "selection_sort", "heap_sort"},
    "graph":   {"bfs", "dfs", "dijkstra", "astar", "bellman_ford",
                "prims", "kruskals", "topological_sort"},
}

BENCHMARK_INPUT_FAMILIES = {
    "sorting": {"random", "sorted", "reversed", "nearly_sorted"},
    "graph": {
        "traversal":     {"sparse_random", "dense_random", "grid", "tree", "complete"},
        "shortest_path": {"sparse_random", "dense_random", "grid", "tree"},
        "mst":           {"sparse_random", "dense_random", "complete", "grid"},
        "ordering":      {"sparse_dag", "dense_dag", "chain", "layered_dag"},
    },
}

BENCHMARK_METRICS = {
    "sorting": {"runtime_ms", "comparisons", "swaps", "writes"},
    "graph": {
        "traversal":     {"runtime_ms", "nodes_visited", "edges_explored", "max_structure_size"},
        "shortest_path": {"runtime_ms", "nodes_visited", "edges_explored", "relaxations"},
        "mst":           {"runtime_ms", "edges_considered", "edges_added", "mst_total_weight"},
        "ordering":      {"runtime_ms", "nodes_ordered", "edges_processed"},
    },
}

BENCHMARK_SIZE_LIMITS = {
    "sorting": {"min": 10, "max": 10_000},
    "graph": {
        "tree":          {"min": 10, "max": 10_000},
        "sparse_random": {"min": 10, "max": 5_000},
        "sparse_dag":    {"min": 10, "max": 5_000},
        "layered_dag":   {"min": 10, "max": 5_000},
        "chain":         {"min": 10, "max": 10_000},
        "grid":          {"min": 9,  "max": 2_500},
        "dense_random":  {"min": 10, "max": 1_000},
        "dense_dag":     {"min": 10, "max": 1_000},
        "complete":      {"min": 10, "max": 500},
    },
}

SIZE_MIN = 9
SIZE_MAX = 10_000
SIZES_MAX_COUNT = 12
TRIALS_MIN = 1
TRIALS_MAX = 20
TRIALS_DEFAULT = 5
ALGORITHMS_MIN = 1

_GRID_FAMILIES = {"grid"}




class CreateBenchmarkRequest(BaseModel):
    model_config = ConfigDict(extra = "forbid")

    module_type: str
    category: str | None = None
    algorithm_keys: list[str]
    input_family: str
    sizes: list[int]
    trials_per_size: int = Field(default = TRIALS_DEFAULT, ge = TRIALS_MIN, le = TRIALS_MAX)
    metrics: list[str]
    
    
    
    @field_validator("module_type")
    @classmethod
    def validate_module_type(cls, v):
        if v not in BENCHMARK_MODULE_TYPES:
            raise ValueError(f"Benchmarking is not supported for module '{v}'. Supported: {sorted(BENCHMARK_MODULE_TYPES)}")
        return v
    
    
    
    @field_validator("algorithm_keys")
    @classmethod
    def validate_algorithm_keys(cls, v):
        if len(v) < ALGORITHMS_MIN:
            raise ValueError(f"At least {ALGORITHMS_MIN} algorithm required")

        if len(set(v)) != len(v):
            raise ValueError("Duplicate algorithm keys")

        return v


    @field_validator("sizes")
    @classmethod
    def validate_sizes(cls, v):
        if len(v) == 0:
            raise ValueError("At least one size required")

        if len(v) > SIZES_MAX_COUNT:
            raise ValueError(f"At most {SIZES_MAX_COUNT} sizes allowed")

        if len(set(v)) != len(v):
            raise ValueError("Duplicate sizes")

        for s in v:
            if s < SIZE_MIN:
                raise ValueError(f"Size {s} is below minimum ({SIZE_MIN})")

            if s > SIZE_MAX:
                raise ValueError(f"Size {s} exceeds maximum ({SIZE_MAX})")

        return sorted(v)


    @field_validator("metrics")
    @classmethod
    def validate_metrics(cls, v):
        if len(v) == 0:
            raise ValueError("At least one metric required")

        if len(set(v)) != len(v):
            raise ValueError("Duplicate metrics")

        return v


    @model_validator(mode = "after")
    def validate_cross_fields(self):
        mt = self.module_type
        cat = self.category

        # --- category presence ---
        if mt == "graph" and cat is None:
            raise ValueError(
                "category is required for graph benchmarks"
            )
        if mt != "graph" and cat is not None:
            raise ValueError(
                f"category is not applicable for {mt} benchmarks"
            )

        # --- validate category key ---
        if mt == "graph":
            graph_cats = BENCHMARK_CATEGORIES.get("graph", {})
            if cat not in graph_cats:
                raise ValueError(
                    f"'{cat}' is not a valid category for graph. "
                    f"Allowed: {sorted(graph_cats)}"
                )

        # --- algorithm_keys ---
        if mt == "graph":
            allowed_algos = set(BENCHMARK_CATEGORIES["graph"][cat])
        else:
            allowed_algos = BENCHMARK_ALGORITHMS.get(mt, set())
        invalid_algos = set(self.algorithm_keys) - allowed_algos
        if invalid_algos:
            if mt == "graph":
                raise ValueError(
                    f"Algorithms {sorted(invalid_algos)} not supported for "
                    f"'{cat}' (category: {cat}). "
                    f"Allowed: {sorted(allowed_algos)}"
                )
            raise ValueError(
                f"Algorithms {sorted(invalid_algos)} not supported for '{mt}'. "
                f"Allowed: {sorted(allowed_algos)}"
            )

        # --- input_family ---
        if mt == "graph":
            allowed_families = BENCHMARK_INPUT_FAMILIES["graph"][cat]
        else:
            allowed_families = BENCHMARK_INPUT_FAMILIES.get(mt, set())
        if self.input_family not in allowed_families:
            if mt == "graph":
                raise ValueError(
                    f"Input family '{self.input_family}' not supported for "
                    f"'{cat}' (category: {cat}). "
                    f"Allowed: {sorted(allowed_families)}"
                )
            raise ValueError(
                f"Input family '{self.input_family}' not supported for '{mt}'. "
                f"Allowed: {sorted(allowed_families)}"
            )

        # --- metrics ---
        if mt == "graph":
            allowed_metrics = BENCHMARK_METRICS["graph"][cat]
        else:
            allowed_metrics = BENCHMARK_METRICS.get(mt, set())
        invalid_metrics = set(self.metrics) - allowed_metrics
        if invalid_metrics:
            if mt == "graph":
                raise ValueError(
                    f"Metrics {sorted(invalid_metrics)} not supported for "
                    f"'{cat}' (category: {cat}). "
                    f"Allowed: {sorted(allowed_metrics)}"
                )
            raise ValueError(
                f"Metrics {sorted(invalid_metrics)} not supported for '{mt}'. "
                f"Allowed: {sorted(allowed_metrics)}"
            )

        # --- per-family size limits ---
        family = self.input_family
        if mt == "graph":
            family_limits = BENCHMARK_SIZE_LIMITS["graph"].get(family)
        else:
            family_limits = BENCHMARK_SIZE_LIMITS.get(mt)

        if family_limits:
            fmin = family_limits["min"]
            fmax = family_limits["max"]
            for s in self.sizes:
                if s < fmin:
                    raise ValueError(
                        f"Size {s} is below minimum ({fmin}) for "
                        f"family '{family}'"
                    )
                if s > fmax:
                    raise ValueError(
                        f"Size {s} exceeds maximum ({fmax}) for "
                        f"family '{family}'"
                    )

        # --- grid sizes must be perfect squares ---
        if family in _GRID_FAMILIES:
            for s in self.sizes:
                root = math.isqrt(s)
                if root * root != s:
                    raise ValueError(
                        f"Size {s} for grid family must be a perfect square "
                        f"(e.g. 9, 25, 100)"
                    )

        return self
    
    
    

BenchmarkStatus = Literal["pending", "running", "completed", "failed"]


class UpdateBenchmarkStatusRequest(BaseModel):
    model_config = ConfigDict(extra = "forbid")

    status: BenchmarkStatus
    progress: float = Field(ge = 0.0, le = 1.0)




class BenchmarkStatusResponse(BaseModel):
    model_config = ConfigDict(from_attributes = True)

    id: int
    module_type: str
    config: dict[str, Any]
    status: str
    progress: float
    created_at: datetime
    completed_at: datetime | None = None



class BenchmarkPoint(BaseModel):
    size: int
    mean: float | None = None
    median: float | None = None
    stddev: float | None = None
    min: float | None = None
    max: float | None = None


class BenchmarkAlgorithmSeries(BaseModel):
    algorithm_key: str
    points: list[BenchmarkPoint]


class BenchmarkTableRow(BaseModel):
    model_config = ConfigDict(extra = "allow")

    algorithm_key: str
    size: int


class BenchmarkResultsResponse(BaseModel):
    id: int
    status: str
    summary: dict[str, Any]
    series: dict[str, list[BenchmarkAlgorithmSeries]]
    table: list[BenchmarkTableRow]
    completed_at: datetime | None = None


class WorkerCountResponse(BaseModel):
    active: int
    idle: int


class QueueCountResponse(BaseModel):
    pending: int
    failed: int


class WorkerHealthResponse(BaseModel):
    workers: WorkerCountResponse
    queue: QueueCountResponse
    healthy: bool
