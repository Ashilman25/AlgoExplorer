from pydantic import BaseModel


class PresetItem(BaseModel):
    key: str
    label: str
    description: str | None = None
    tags: list[str] = []
    designed_for: list[str] = []
    input_payload: dict


class PresetGroup(BaseModel):
    group_key: str
    presets: list[PresetItem]


class PresetsResponse(BaseModel):
    module_type: str
    groups: list[PresetGroup]
