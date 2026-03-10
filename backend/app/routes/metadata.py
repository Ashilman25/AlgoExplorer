from fastapi import APIRouter
from app.data.registry import REGISTRY
from app.exceptions import NotFoundException
from app.schemas.metadata import AlgorithmMetadata, ModuleMetadata, MetadataResponse

router = APIRouter(prefix = "/api/metadata")

# if module_key not in REGISTRY:
#             raise NotFoundException(f"Module '{module_key}' not found.")

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
