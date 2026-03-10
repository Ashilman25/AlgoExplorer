from pydantic import BaseModel


class AlgorithmMetadata(BaseModel):
    key: str
    label: str
    description: str

    supported_modes: list[str]
    supported_explanation_levels: list[str]
    variants: list[str] | None = None


class ModuleMetadata(BaseModel):
    key: str
    label: str
    description: str

    features: list[str]
    presets: list[str] | None = None
    algorithms: list[AlgorithmMetadata]


class MetadataResponse(BaseModel):
    modules: list[ModuleMetadata]