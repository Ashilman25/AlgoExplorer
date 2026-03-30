from pydantic import BaseModel


class ComplexityTime(BaseModel):
    best: str
    average: str
    worst: str


class Complexity(BaseModel):
    time: ComplexityTime
    space: str


class UseCases(BaseModel):
    use_when: list[str]
    avoid_when: list[str]


class Scenarios(BaseModel):
    best_case: str
    worst_case: str


class LearningInfo(BaseModel):
    complexity: Complexity
    properties: list[str]
    insights: list[str]
    use_cases: UseCases
    scenarios: Scenarios


class AlgorithmMetadata(BaseModel):
    key: str
    label: str
    description: str

    supported_modes: list[str]
    supported_explanation_levels: list[str]
    variants: list[str] | None = None
    learning_info: LearningInfo | None = None


class ModuleMetadata(BaseModel):
    key: str
    label: str
    description: str

    features: list[str]
    presets: list[str] | None = None
    algorithms: list[AlgorithmMetadata]


class MetadataResponse(BaseModel):
    modules: list[ModuleMetadata]