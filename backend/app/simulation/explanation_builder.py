from typing import Any

from app.simulation.types import ExplanationLevel
from app.schemas.timeline import StepExplanation


class ExplanationBuilder:
    def __init__(self, level: ExplanationLevel):
        self.level = level

    def build(self, title: str, body: str, data_snapshot: dict[str, Any] | None = None) -> StepExplanation:
        if self.level == "none":
            return StepExplanation(title = title)
        
        if self.level == "standard":
            return StepExplanation(title = title, body = body)
        
        return StepExplanation(title = title, body = body, data_snapshot = data_snapshot)
