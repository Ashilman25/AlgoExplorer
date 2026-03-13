from typing import Any, Literal
from pydantic import BaseModel, Field

from app.schemas.timeline import TimelineStep

ExplanationLevel = Literal["none", "standard", "detailed"]
ExecutionMode = Literal["simulate", "benchmark"]


class AlgorithmInput(BaseModel):
    input_payload: dict[str, Any]
    algorithm_config: dict[str, Any] = Field(default_factory = dict)
    execution_mode: ExecutionMode = "simulate"
    explanation_level: ExplanationLevel = "standard"


class AlgorithmOutput(BaseModel):
    timeline_steps: list[TimelineStep]
    final_result: dict[str, Any]
    summary_metrics: dict[str, Any]
    algorithm_metadata: dict[str, Any]
