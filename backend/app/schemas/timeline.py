from typing import Dict, List, Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class TimelineStep(BaseModel):
    step_index: int
    label: str
    
    highlighted_entities: dict[str, Any]
    metric_snapshot: dict[str, Any]

    explanation: str | None = None
    
class TimelineResponse(BaseModel):
    run_id: int
    total_steps: int
    
    module_type: str
    algorithm_key: str
    
    steps: list[TimelineStep]