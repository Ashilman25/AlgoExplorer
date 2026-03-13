from typing import Any
from pydantic import BaseModel


class HighlightedEntity(BaseModel):
    id: str | int | list[int]
    state: str
    label: str | None = None


class TimelineStep(BaseModel):
    step_index: int
    event_type: str   
    
    state_payload: dict[str, Any]          
    highlighted_entities: list[HighlightedEntity] 
    metrics_snapshot: dict[str, Any]          
    
    explanation: str | None = None  
    timestamp_or_order: int = 0     


class TimelineResponse(BaseModel):
    run_id: int
    total_steps: int
    
    module_type: str
    algorithm_key: str
    
    steps: list[TimelineStep]