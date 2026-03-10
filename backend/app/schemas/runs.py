from typing import Dict, List, Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class CreateRunRequest(BaseModel):
    model_config = ConfigDict(extra = "forbid")
    
    module_type: str
    algorithm_key: str
    
    input_payload: dict[str, Any]
    algorithm_config: dict[str, Any] | None = None
    
    execution_mode: str
    explanation_level: str
    scenario_id: int | None = None
     
class CreateRunResponse(BaseModel):
    model_config = ConfigDict(from_attributes = True)
    id: int
    
    module_type: str
    algorithm_key: str
    
    summary: dict[str, Any]
    timeline_available: bool
    created_at: datetime
    
    
class RunSummary(BaseModel):
    model_config = ConfigDict(from_attributes = True)
    id: int
    
    module_type: str
    algorithm_key: str
    
    summary: dict[str, Any]
    created_at: datetime