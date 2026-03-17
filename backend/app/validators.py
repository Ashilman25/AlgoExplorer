import math
from pydantic import ValidationError
from app.exceptions import DomainError
from app.data.registry import REGISTRY
from app.schemas.payloads import (
    SortingInputPayload,
    DPStringInputPayload,
    KnapsackInputPayload,
    CoinChangeInputPayload,
    FibonacciInputPayload,
)

#check module_type in registry, and alg_key in that module in registry
def validate_module_algorithm(module_key: str, algorithm_key: str):
    if module_key not in REGISTRY:
        raise DomainError(f"Module '{module_key}' not found in Registry")
    
    module_data = REGISTRY[module_key]
    if algorithm_key not in module_data["algorithms"]:
        raise DomainError(f"Algorithm '{algorithm_key}' not found in '{module_key}' module")
    
    
    
#checks node is a list, each node has an id field
#edges is a list, each edge has source and target
#no duplicate node ids
#edge endpoints reference existing node ids
def validate_graph_payload(input_payload: dict):
    if "nodes" not in input_payload:
        raise DomainError("Missing 'nodes' in payload")

    if "edges" not in input_payload:
        raise DomainError("Missing 'edges' in payload")

    nodes = input_payload["nodes"]
    edges = input_payload["edges"]

    # graph not empty
    if len(nodes) < 1:
        raise DomainError("Graph must have at least one node")

    ids = set()
    for node in nodes:
        if "id" not in node:
            raise DomainError(f"Node '{node}' missing id")

        if node["id"] in ids:
            raise DomainError(f"Node '{node['id']}' has duplicate id")
        ids.add(node["id"])

    for edge in edges:
        if "source" not in edge:
            raise DomainError(f"Edge '{edge}' missing source")

        if "target" not in edge:
            raise DomainError(f"Edge '{edge}' missing target")

        if edge["source"] not in ids:
            raise DomainError(f"Edge source '{edge['source']}' does not reference a valid node")

        if edge["target"] not in ids:
            raise DomainError(f"Edge target '{edge['target']}' does not reference a valid node")
        
        if "weight" in edge and edge["weight"] is not None:
            w = edge["weight"]
            
            if not isinstance(w, (int, float)):
                raise DomainError(f"Edge weight '{w}' must be a number")
            
            if math.isnan(w) or math.isinf(w):
                raise DomainError(f"Edge weight must not be NaN or infinity")
            
            if w < 0:
                raise DomainError(f"Edge weight '{w}' must not be negative")

    # valid source and target
    source = input_payload.get("source")
    if source is not None and source not in ids:
        raise DomainError(f"Source '{source}' does not reference a valid node")

    target = input_payload.get("target")
    if target is not None and target not in ids:
        raise DomainError(f"Target '{target}' does not reference a valid node")
        
        
        
ANIMATION_SIZE_LIMIT = 200


# validates sorting input payload
def validate_array_payload(input_payload: dict):

    try:
        parsed = SortingInputPayload.model_validate(input_payload)
        
    except ValidationError as e:
        first_error = e.errors()[0]
        
        loc_list = first_error["loc"]
        string_locations = []
        
        for loc in loc_list:
            string_locations.append(str(loc))
            
        field = " -> ".join(string_locations)
        
        raise DomainError(f"Invalid sorting input ({field}): {first_error['msg']}")

    arr = parsed.array

    if len(arr) < 2:
        raise DomainError("Array must contain at least 2 elements")

    if len(arr) > 10000:
        raise DomainError("Array must contain at most 10,000 elements")

    # check each element for NaN / infinity
    for each in arr:
        if math.isnan(each) or math.isinf(each):
            raise DomainError("Array must not contain NaN or infinity values")

    # animation size limit enforcement
    if len(arr) > parsed.animation_max_size:
        raise DomainError(
            f"Array size ({len(arr)}) exceeds animation limit ({parsed.animation_max_size}). "
            "Reduce size or increase animation_max_size."
        )



DP_PAYLOAD_MODELS = {
    "lcs": DPStringInputPayload,
    "edit_distance": DPStringInputPayload,
    "knapsack_01": KnapsackInputPayload,
    "coin_change": CoinChangeInputPayload,
    "fibonacci": FibonacciInputPayload,
}


def validate_dp_payload(algorithm_key: str, input_payload: dict):

    model_class = DP_PAYLOAD_MODELS.get(algorithm_key)

    if model_class is None:
        raise DomainError(f"Unknown DP algorithm '{algorithm_key}'")

    try:
        model_class.model_validate(input_payload)

    except ValidationError as e:
        first_error = e.errors()[0]

        loc_list = first_error["loc"]
        string_locations = []

        for loc in loc_list:
            string_locations.append(str(loc))

        field = " -> ".join(string_locations)

        raise DomainError(f"Invalid {algorithm_key} input ({field}): {first_error['msg']}")

