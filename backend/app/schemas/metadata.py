from typing import Dict, List, Optional, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class AlgorithmMetadata(BaseModel):
    key: str
    label: str
    description: str
    
    supported_modes: list[str]
    supported_explanation_levels: list[str]
    
class ModuleMetadata(BaseModel):
    key: str
    label: str
    description: str
    
    algorithms: list[AlgorithmMetadata]
    
class MetadataResponse(BaseModel):
    modules: list[ModuleMetadata]