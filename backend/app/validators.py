import math
from app.exceptions import DomainError
from app.data.registry import REGISTRY

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
        
        
        
VALID_SORTING_PRESETS = {"random", "reversed", "nearly_sorted", "duplicates", "custom"}
VALID_DUPLICATE_DENSITIES = {"none", "low", "medium", "high"}
ANIMATION_SIZE_LIMIT = 200


#checks array key exists and is a list
#all elements are ints or float
#length is within 1 to 10,000
# no NaN or inf
# validates preset, duplicate_density, and animation size limits
def validate_array_payload(input_payload: dict):
    if "array" not in input_payload:
        raise DomainError("Input payload does not contain 'array' key")

    if not isinstance(input_payload["array"], list):
        raise DomainError("'array' must be a list")

    arr = input_payload["array"]

    if len(arr) < 2:
        raise DomainError("Array must contain at least 2 elements")

    if len(arr) > 10000:
        raise DomainError("Array must contain at most 10,000 elements")

    for each in arr:
        if not isinstance(each, (int, float)):
            raise DomainError("Array must only contain numbers")

        if math.isnan(each) or math.isinf(each):
            raise DomainError("Array must not contain NaN or infinity values")

    # validate preset if provided
    preset = input_payload.get("preset", "random")
    if preset not in VALID_SORTING_PRESETS:
        raise DomainError(f"Invalid preset '{preset}'. Must be one of: {', '.join(sorted(VALID_SORTING_PRESETS))}")

    # validate duplicate_density if provided
    dup_density = input_payload.get("duplicate_density", "none")
    if dup_density not in VALID_DUPLICATE_DENSITIES:
        raise DomainError(f"Invalid duplicate_density '{dup_density}'. Must be one of: {', '.join(sorted(VALID_DUPLICATE_DENSITIES))}")

    # animation size limit: warn if array exceeds animation cap
    animation_max = input_payload.get("animation_max_size", ANIMATION_SIZE_LIMIT)
    if not isinstance(animation_max, int) or animation_max < 1 or animation_max > 10000:
        raise DomainError("animation_max_size must be an integer between 1 and 10,000")

    if len(arr) > animation_max:
        raise DomainError(
            f"Array size ({len(arr)}) exceeds animation limit ({animation_max}). "
            "Reduce size or increase animation_max_size."
        )



#validates dp input payload based on algorithm_key
def validate_dp_payload(algorithm_key: str, input_payload: dict):

    if algorithm_key in ("lcs", "edit_distance"):
        if "string1" not in input_payload or "string2" not in input_payload:
            raise DomainError(f"'{algorithm_key}' requires 'string1' and 'string2'")
        
        if not isinstance(input_payload["string1"], str) or not isinstance(input_payload["string2"], str):
            raise DomainError("'string1' and 'string2' must be strings")
        
        if len(input_payload["string1"]) > 50 or len(input_payload["string2"]) > 50:
            raise DomainError("Strings must be 50 characters or fewer")

    elif algorithm_key == "knapsack_01":
        if "capacity" not in input_payload or "items" not in input_payload:
            raise DomainError("'knapsack_01' requires 'capacity' and 'items'")
        
        if not isinstance(input_payload["capacity"], int) or input_payload["capacity"] < 1 or input_payload["capacity"] > 1000:
            raise DomainError("'capacity' must be an integer between 1 and 1000")
        
        if not isinstance(input_payload["items"], list) or len(input_payload["items"]) < 1 or len(input_payload["items"]) > 100:
            raise DomainError("'items' must be a list of 1 to 100 items")

    elif algorithm_key == "coin_change":
        if "coins" not in input_payload or "target" not in input_payload:
            raise DomainError("'coin_change' requires 'coins' and 'target'")
        
        if not isinstance(input_payload["coins"], list) or len(input_payload["coins"]) < 1 or len(input_payload["coins"]) > 50:
            raise DomainError("'coins' must be a list of 1 to 50 values")
        
        if not isinstance(input_payload["target"], int) or input_payload["target"] < 1 or input_payload["target"] > 10000:
            raise DomainError("'target' must be an integer between 1 and 10000")

    elif algorithm_key == "fibonacci":
        if "n" not in input_payload:
            raise DomainError("'fibonacci' requires 'n'")
        
        if not isinstance(input_payload["n"], int) or input_payload["n"] < 1 or input_payload["n"] > 50:
            raise DomainError("'n' must be an integer between 1 and 50")

    else:
        raise DomainError(f"Unknown DP algorithm '{algorithm_key}'")

