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
def validate_graph_payload(input_payload: dict, algorithm_key: str = "bfs"):
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

            if w < 0 and algorithm_key != "bellman_ford":
                raise DomainError(f"Edge weight '{w}' must not be negative")

    # valid source and target
    source = input_payload.get("source")
    if source is not None and source not in ids:
        raise DomainError(f"Source '{source}' does not reference a valid node")

    target = input_payload.get("target")
    if target is not None and target not in ids:
        raise DomainError(f"Target '{target}' does not reference a valid node")

    # A* requires coordinates on every node
    if algorithm_key == "astar":
        for node in nodes:
            if node.get("x") is None or node.get("y") is None:
                raise DomainError(
                    f"A* requires coordinates (x, y) on every node. "
                    f"Node '{node['id']}' is missing coordinates."
                )

    # MST algorithms require weighted edges
    if algorithm_key in ("prims", "kruskals"):
        for edge in edges:
            if edge.get("weight") is None:
                raise DomainError(
                    f"MST algorithms require weighted edges. "
                    f"Edge '{edge['source']}' -> '{edge['target']}' has no weight."
                )

    # Topological sort requires directed graph
    if algorithm_key == "topological_sort":
        if not input_payload.get("directed", False):
            raise DomainError("Topological Sort requires a directed graph.")
        
        
        
ANIMATION_SIZE_LIMIT = 200


# validates sorting input payload
def validate_array_payload(input_payload: dict, algorithm_key: str = "quicksort"):

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

    # search algorithms require a target value
    if algorithm_key in ("binary_search", "linear_search"):
        if parsed.target is None:
            raise DomainError("Search algorithms require a 'target' value")

        if isinstance(parsed.target, float) and (math.isnan(parsed.target) or math.isinf(parsed.target)):
            raise DomainError("Search target must not be NaN or infinity")

    # binary search requires a sorted array
    if algorithm_key == "binary_search":
        for i in range(len(arr) - 1):
            if arr[i] > arr[i + 1]:
                raise DomainError(
                    "Binary Search requires a sorted array. "
                    "Use a sorted preset or provide a sorted custom array."
                )



# max cells a DP table can have for visualization (rows * cols)
DP_TABLE_MAX_CELLS = 2500


DP_PAYLOAD_MODELS = {
    "lcs": DPStringInputPayload,
    "edit_distance": DPStringInputPayload,
    "knapsack_01": KnapsackInputPayload,
    "coin_change": CoinChangeInputPayload,
    "fibonacci": FibonacciInputPayload,
}


#validates dp input payload based on algorithm_key
def validate_dp_payload(algorithm_key: str, input_payload: dict):

    model_class = DP_PAYLOAD_MODELS.get(algorithm_key)

    if model_class is None:
        raise DomainError(f"Unknown DP algorithm '{algorithm_key}'")

    try:
        parsed = model_class.model_validate(input_payload)

    except ValidationError as e:
        first_error = e.errors()[0]

        loc_list = first_error["loc"]
        string_locations = []

        for loc in loc_list:
            string_locations.append(str(loc))

        field = " -> ".join(string_locations)

        raise DomainError(f"Invalid {algorithm_key} input ({field}): {first_error['msg']}")

    # domain checks after schema validation passes
    if algorithm_key in ("lcs", "edit_distance"):
        _validate_dp_strings(parsed)

    elif algorithm_key == "knapsack_01":
        _validate_knapsack(parsed)

    elif algorithm_key == "coin_change":
        _validate_coin_change(parsed)


def _validate_dp_strings(parsed: DPStringInputPayload):
    s1, s2 = parsed.string1, parsed.string2

    # both strings empty is meaningless
    if len(s1) == 0 and len(s2) == 0:
        raise DomainError("At least one string must be non-empty")

    # reject whitespace-only strings
    if len(s1) > 0 and s1.isspace():
        raise DomainError("'string1' must not be whitespace-only")

    if len(s2) > 0 and s2.isspace():
        raise DomainError("'string2' must not be whitespace-only")

    # table size: (len+1) * (len+1) for LCS / Edit Distance
    table_cells = (len(s1) + 1) * (len(s2) + 1)

    if table_cells > DP_TABLE_MAX_CELLS:
        raise DomainError(
            f"DP table size ({len(s1)+1} x {len(s2)+1} = {table_cells} cells) "
            f"exceeds visualization limit of {DP_TABLE_MAX_CELLS} cells. "
            "Use shorter strings."
        )


def _validate_knapsack(parsed: KnapsackInputPayload):
    # table size: (items+1) * (capacity+1)
    rows = len(parsed.items) + 1
    cols = parsed.capacity + 1
    table_cells = rows * cols

    if table_cells > DP_TABLE_MAX_CELLS:
        raise DomainError(
            f"DP table size ({rows} x {cols} = {table_cells} cells) "
            f"exceeds visualization limit of {DP_TABLE_MAX_CELLS} cells. "
            "Reduce item count or capacity."
        )


def _validate_coin_change(parsed: CoinChangeInputPayload):
    # each coin must be positive
    for coin in parsed.coins:
        if coin < 1:
            raise DomainError(f"Coin value {coin} must be at least 1")

    # no duplicate coins
    if len(set(parsed.coins)) != len(parsed.coins):
        raise DomainError("Coin values must be unique")

    # table size: (coins+1) * (target+1)
    rows = len(parsed.coins) + 1
    cols = parsed.target + 1
    table_cells = rows * cols

    if table_cells > DP_TABLE_MAX_CELLS:
        raise DomainError(
            f"DP table size ({rows} x {cols} = {table_cells} cells) "
            f"exceeds visualization limit of {DP_TABLE_MAX_CELLS} cells. "
            "Reduce coin count or target amount."
        )

