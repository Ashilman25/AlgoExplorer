from typing import Any, Literal
from pydantic import BaseModel, Field, ConfigDict


class GraphNode(BaseModel):
    id: str | int
    x: float | None = None
    y: float | None = None


class GraphEdge(BaseModel):
    source: str | int
    target: str | int
    weight: float | None = None


class GraphInputPayload(BaseModel):
    model_config = ConfigDict(extra = "forbid")

    nodes: list[GraphNode]
    edges: list[GraphEdge]

    source: str | int | None = None
    target: str | int | None = None
    
    weighted: bool = False
    directed: bool = False
    
    mode: Literal["graph"] = "graph"


#for grid/maze stuff
class GridCell(BaseModel):
    row: int
    col: int


class GridInputPayload(BaseModel):
    model_config = ConfigDict(extra = "forbid")

    grid: list[list[int]]  # 0 = passable, 1 = wall
    source: GridCell
    target: GridCell
    
    weighted: bool = False
    mode: Literal["grid"] = "grid"


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



class SortingInputPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    array: list[int | float]
    preset: Literal["random", "reversed", "nearly_sorted", "duplicates", "custom"] = "random"
    duplicate_density: Literal["none", "low", "medium", "high"] = "none"

    animation_max_size: int = Field(default = 200, ge = 1, le = 10000)

    # searching algorithms only — ignored by sorting algorithms
    target: int | float | None = None


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

    # searching visualization fields
    search_low: int | None = None
    search_mid: int | None = None
    search_high: int | None = None
    search_target: int | float | None = None
    found_index: int | None = None


class SearchingEvents:
    INITIALIZE = "initialize"
    SET_RANGE = "set_range"
    CHECK_MID = "check_mid"
    NARROW_LEFT = "narrow_left"
    NARROW_RIGHT = "narrow_right"
    SCAN = "scan"
    FOUND = "found"
    NOT_FOUND = "not_found"
    COMPLETE = "complete"


class DPStringInputPayload(BaseModel):
    model_config = ConfigDict(extra = "forbid")

    string1: str = Field(min_length = 0, max_length = 50)
    string2: str = Field(min_length = 0, max_length = 50)


class KnapsackItem(BaseModel):
    weight: int = Field(ge = 1)
    value: int = Field(ge = 1)


class KnapsackInputPayload(BaseModel):
    model_config = ConfigDict(extra = "forbid")

    capacity: int = Field(ge = 1, le = 1000)
    items: list[KnapsackItem] = Field(min_length = 1, max_length = 100)


class CoinChangeInputPayload(BaseModel):
    model_config = ConfigDict(extra = "forbid")

    coins: list[int] = Field(min_length=1, max_length=50)
    target: int = Field(ge = 1, le = 10000)


class FibonacciInputPayload(BaseModel):
    model_config = ConfigDict(extra = "forbid")

    n: int = Field(ge = 1, le = 50)


class DPEvents:
    INITIALIZE = "initialize"
    COMPUTE_CELL = "compute_cell"
    READ_DEPENDENCY = "read_dependency"
    FILL_CELL = "fill_cell"
    ROW_COMPLETE = "row_complete"
    TRACEBACK_START = "traceback_start"
    TRACEBACK_STEP = "traceback_step"
    COMPLETE = "complete"        


class DPStatePayload(BaseModel):
    table: list[list[int | float | str | None]]
    cell_states: list[list[str]]
    current_cell: list[int] | None = None
    dependency_cells: list[list[int]] = Field(default_factory = list)
    traceback_path: list[list[int]] = Field(default_factory = list)
