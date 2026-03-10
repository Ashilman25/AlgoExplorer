from typing import Dict, List, Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class CreateBenchmarkRequest(BaseModel):
    model_config = ConfigDict(extra = "forbid")
    
    module_type: str
    config: dict[str, Any]
    

class CreateBenchmarkResponse(BaseModel):
    model_config = ConfigDict(from_attributes = True)
    
    id: int
    status: str
    
    created_at: datetime
    
    
class BenchmarkStatusResponse(BaseModel):
    model_config = ConfigDict(from_attributes = True)
    
    id: int
    status: str
    progress: float
    
    created_at: datetime
    completed_at: datetime | None = None

    
    
class BenchmarkResultsResponse(BaseModel):
    model_config = ConfigDict(from_attributes = True)
    
    id: int
    status: str
    
    summary: dict[str, Any]
    results: dict[str, Any]
    completed_at: datetime | None = None
    
