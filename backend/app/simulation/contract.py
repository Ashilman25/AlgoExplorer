from abc import ABC, abstractmethod
from app.simulation.types import AlgorithmInput, AlgorithmOutput


class BaseAlgorithm(ABC):
    @property
    @abstractmethod
    def module_type(self) -> str:
        ...

    @property
    @abstractmethod
    def algorithm_key(self) -> str:
        ...

    @abstractmethod
    def run(self, algo_input: AlgorithmInput) -> AlgorithmOutput:
        ...

    def build_metadata(self, algo_input: AlgorithmInput) -> dict:
        return {
            "module_type": self.module_type,
            "algorithm_key": self.algorithm_key,
            "execution_mode": algo_input.execution_mode,
            "explanation_level": algo_input.explanation_level,
            "config": dict(algo_input.algorithm_config),
        }
