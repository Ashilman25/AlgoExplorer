from fastapi import APIRouter, Query, Request

from app.config import settings
from app.data.presets import PRESETS
from app.exceptions import NotFoundException
from app.rate_limiting import limiter
from app.schemas.presets import PresetGroup, PresetItem, PresetsResponse


router = APIRouter(prefix = "/api/presets")


@router.get("/{module_type}")
@limiter.limit(settings.rate_limit_readonly)
def get_presets(request: Request, module_type: str, algorithm_key: str | None = Query(default = None)):
    if module_type not in PRESETS:
        raise NotFoundException(f"No presets for module '{module_type}'.")

    module_presets = PRESETS[module_type]

    # Graph: always return all presets (frontend handles grouping/display)
    if module_type == "graph":
        groups = [
            PresetGroup(
                group_key = gk,
                presets = [PresetItem(**p) for p in presets],
            )
            for gk, presets in module_presets.items()
        ]
        return PresetsResponse(module_type = module_type, groups = groups)

    # No algorithm_key: return all groups for the module
    if algorithm_key is None:
        groups = [
            PresetGroup(
                group_key = gk,
                presets = [PresetItem(**p) for p in presets],
            )
            for gk, presets in module_presets.items()
        ]
        return PresetsResponse(module_type = module_type, groups = groups)

    # DP: algorithm_key selects a preset group directly
    if algorithm_key not in module_presets:
        raise NotFoundException(
            f"No presets for algorithm '{algorithm_key}' in module '{module_type}'."
        )
    group_data = module_presets[algorithm_key]
    groups = [
        PresetGroup(
            group_key = algorithm_key,
            presets = [PresetItem(**p) for p in group_data],
        )
    ]
    return PresetsResponse(module_type = module_type, groups = groups)
