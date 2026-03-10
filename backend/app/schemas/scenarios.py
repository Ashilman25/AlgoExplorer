from typing import Dict, List, Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class ScenarioPayload(BaseModel):
    model_config = ConfigDict(extra = "forbid")
    
    name: str
    module_type: str
    algorithm_key: str
    
    input_payload: dict[str, Any]
    algorithm_config: dict[str, Any] | None = None
    
    
class ScenarioExportPayload(BaseModel):
    name: str
    module_type: str
    algorithm_key: str
    
    input_payload: dict[str, Any]
    algorithm_config: dict[str, Any] | None = None
    
    id: str
    created_at: datetime
    
    
class GuestRunHistoryItem(BaseModel):
    run_id: str
    module_type: str
    
    algorithm_key: str
    
    summary: dict[str, Any]
    created_at: datetime