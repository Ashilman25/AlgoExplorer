from typing import Any, Literal
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict, field_validator, model_validator

BENCHMARK_MODULE_TYPES = {"sorting"}

BENCHMARK_ALGORITHMS = {
    "sorting": {"quicksort", "mergesort"},
}

BENCHMARK_INPUT_FAMILIES = {
    "sorting": {"random", "sorted", "reversed", "nearly_sorted"},
}

BENCHMARK_METRICS = {
    "sorting": {"runtime_ms", "comparisons", "swaps"},
}

SIZE_MIN = 10
SIZE_MAX = 10_000
SIZES_MAX_COUNT = 12
TRIALS_MIN = 1
TRIALS_MAX = 20
TRIALS_DEFAULT = 5
ALGORITHMS_MIN = 1
ALGORITHMS_MAX = 5




class CreateBenchmarkRequest(BaseModel):
    model_config = ConfigDict(extra = "forbid")
    
    module_type: str
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

        if len(v) > ALGORITHMS_MAX:
            raise ValueError(f"At most {ALGORITHMS_MAX} algorithms allowed")

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
        
        return v


    @model_validator(mode="after")
    def validate_cross_fields(self):
        mt = self.module_type

        # algorithm_keys must belong to this module
        allowed_algos = BENCHMARK_ALGORITHMS.get(mt, set())
        invalid_algos = set(self.algorithm_keys) - allowed_algos
        if invalid_algos:
            raise ValueError(
                f"Algorithms {sorted(invalid_algos)} not supported for '{mt}'. "
                f"Allowed: {sorted(allowed_algos)}"
            )

        # input_family must belong to this module
        allowed_families = BENCHMARK_INPUT_FAMILIES.get(mt, set())
        if self.input_family not in allowed_families:
            raise ValueError(
                f"Input family '{self.input_family}' not supported for '{mt}'. "
                f"Allowed: {sorted(allowed_families)}"
            )

        # metrics must belong to this module
        allowed_metrics = BENCHMARK_METRICS.get(mt, set())
        invalid_metrics = set(self.metrics) - allowed_metrics
        if invalid_metrics:
            raise ValueError(
                f"Metrics {sorted(invalid_metrics)} not supported for '{mt}'. "
                f"Allowed: {sorted(allowed_metrics)}"
            )

        return self
    
    
    

class UpdateBenchmarkStatusRequest(BaseModel):
    model_config = ConfigDict(extra = "forbid")

    status: str
    progress: float




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
    mean: float
    median: float
    stddev: float
    min: float
    max: float


class BenchmarkAlgorithmSeries(BaseModel):
    algorithm_key: str
    points: list[BenchmarkPoint]


class BenchmarkTableRow(BaseModel):
    algorithm_key: str
    size: int
    runtime_mean: float | None = None
    runtime_median: float | None = None
    comparisons_mean: float | None = None
    comparisons_median: float | None = None
    swaps_mean: float | None = None
    swaps_median: float | None = None


class BenchmarkResultsResponse(BaseModel):
    id: int
    status: str
    summary: dict[str, Any]
    series: dict[str, list[BenchmarkAlgorithmSeries]]
    table: list[BenchmarkTableRow]
    completed_at: datetime | None = None
