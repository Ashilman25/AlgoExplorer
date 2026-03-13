from typing import Any
from pydantic import BaseModel, Field


class GraphEvents:
    INITIALIZE = "initialize"  
    ENQUEUE = "enqueue"        
    DEQUEUE = "dequeue"        
    VISIT_NODE = "visit_node"     
    EXPLORE_EDGE = "explore_edge" 
    RELAX_EDGE = "relax_edge"     
    PATH_FOUND = "path_found"     
    NO_PATH = "no_path"        
    COMPLETE = "complete"      


class GraphStatePayload(BaseModel):
    node_states: dict[str, str]
    edge_states: dict[str, str] = Field(default_factory = dict)
    frontier: list[Any] = Field(default_factory = list)
    distances: dict[str, float | int] | None = None
    path: list[str | int] | None = None



class SortingEvents:
    INITIALIZE = "initialize"   
    COMPARE = "compare"         
    SWAP = "swap"            
    NO_SWAP = "no_swap"         
    SET_PIVOT = "set_pivot"       
    PARTITION_START = "partition_start"
    PARTITION_END = "partition_end"   
    MERGE = "merge"           
    INSERT = "insert"          
    MARK_SORTED = "mark_sorted"
    COMPLETE = "complete"      


class SortingStatePayload(BaseModel):
    array: list[int | float]
    element_states: list[str]
    comparing: list[int] = Field(default_factory = list)
    swapping: list[int] = Field(default_factory = list)
    pivot_index: int | None = None
    sorted_boundary: int | None = None



class DPEvents:
    INITIALIZE = "initialize"      
    COMPUTE_CELL = "compute_cell"    
    READ_DEPENDENCY = "read_dependency"
    FILL_CELL = "fill_cell"       
    TRACEBACK_START = "traceback_start"  
    TRACEBACK_STEP = "traceback_step"   
    COMPLETE = "complete"        


class DPStatePayload(BaseModel):
    table: list[list[int | float | str | None]]
    cell_states: list[list[str]]
    current_cell: list[int] | None = None
    dependency_cells: list[list[int]] = Field(default_factory = list)
    traceback_path: list[list[int]] = Field(default_factory = list)
