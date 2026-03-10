from fastapi import APIRouter
from app.data.registry import REGISTRY
from app.exceptions import NotFoundException
from app.schemas.metadata import AlgorithmMetadata, ModuleMetadata, MetadataResponse

router = APIRouter(prefix = "/api/metadata")

#gets all modules and their metadata
@router.get("/modules")
def get_modules():
    metadatas = []
    
    for module_key, module_data in REGISTRY.items():
        algs = []
        
        for alg_key, alg_data in module_data["algorithms"].items():
            alg_metadata = AlgorithmMetadata(
                key = alg_key,
                label = alg_data["label"],
                description = alg_data["description"],
                supported_modes = alg_data["supported_modes"],
                supported_explanation_levels = alg_data["supported_explanation_levels"],
                variants = alg_data.get("variants")
            )
            
            algs.append(alg_metadata)
            
        module_metadata = ModuleMetadata(
            key = module_key,
            label = module_data["label"],
            description = module_data["description"],
            features = module_data["features"],
            presets = module_data.get("presets"),
            algorithms = algs
        )
        
        metadatas.append(module_metadata)
        
    response = MetadataResponse(modules = metadatas)
    return response


#gets metadata for a specific module (graph, sorting, dp)
@router.get("/modules/{module_key}")
def get_module_by_key(module_key: str):
    if module_key not in REGISTRY:
        raise NotFoundException(f"Module '{module_key}' not found.")
    
    module_data = REGISTRY[module_key]
    algs = []
    
    for alg_key, alg_data in module_data["algorithms"].items():
        alg_metadata = AlgorithmMetadata(
            key = alg_key,
            label = alg_data["label"],
            description = alg_data["description"],
            supported_modes = alg_data["supported_modes"],
            supported_explanation_levels = alg_data["supported_explanation_levels"],
            variants = alg_data.get("variants")
        )
        algs.append(alg_metadata)
        
    module_metadata = ModuleMetadata(
        key = module_key,
        label = module_data["label"],
        description = module_data["description"],
        features = module_data["features"],
        presets = module_data.get("presets"),
        algorithms = algs
    )
    
    return module_metadata
    

#gets specific metadata for algorithm in specific module
@router.get("/modules/{module_key}/algorithms/{algorithm_key}")
def get_alg_by_key(module_key: str, algorithm_key: str):
    if module_key not in REGISTRY:
        raise NotFoundException(f"Module '{module_key}' not found.")
    
    module_data = REGISTRY[module_key]
    if algorithm_key not in module_data["algorithms"]:
        raise NotFoundException(f"Algorithm '{algorithm_key}' not found.")
    
    alg_data = module_data["algorithms"]
    specific_data = alg_data[algorithm_key]
    
    alg_metadata = AlgorithmMetadata(
        key = algorithm_key,
        label = specific_data["label"],
        description = specific_data["description"],
        supported_modes = specific_data["supported_modes"],
        supported_explanation_levels = specific_data["supported_explanation_levels"],
        variants = specific_data.get("variants")
    )
    
    return alg_metadata
