from typing import Type
from app.simulation.contract import BaseAlgorithm

_registry: dict[tuple[str, str], Type[BaseAlgorithm]] = {}

# @register("graph", "bfs")
# class BFS(BaseAlgorithm): ...
def register(module_type: str, algorithm_key: str):
    def decorator(cls: Type[BaseAlgorithm]) -> Type[BaseAlgorithm]:
        _registry[(module_type, algorithm_key)] = cls
        return cls
    
    return decorator


def get_algorithm(module_type: str, algorithm_key: str) -> BaseAlgorithm:
    cls = _registry.get((module_type, algorithm_key))
    if cls is None:
        raise KeyError((module_type, algorithm_key))
    
    return cls()


def is_registered(module_type: str, algorithm_key: str) -> bool:
    return (module_type, algorithm_key) in _registry


def registered_keys() -> list[tuple[str, str]]:
    return list(_registry.keys())
