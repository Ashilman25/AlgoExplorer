from fastapi import APIRouter, Query, Request

from app.config import settings
from app.data.presets import PRESETS
from app.exceptions import NotFoundException
from app.rate_limiting import limiter
from app.schemas.presets import PresetGroup, PresetItem, PresetsResponse


router = APIRouter(prefix = "/api/presets")


ALGORITHM_CATEGORY: dict[str, str] = {
    "bfs": "pathfinding",
    "dfs": "pathfinding",
    "dijkstra": "pathfinding",
    "astar": "pathfinding",
    "bellman_ford": "pathfinding",
    "prims": "mst",
    "kruskals": "mst",
    "topological_sort": "ordering",
}



@router.get("/{module_type}")
@limiter.limit(settings.rate_limit_readonly)
def get_presets(request: Request, module_type: str, algorithm_key: str | None = Query(default = None)):
    if module_type not in PRESETS:
        raise NotFoundException(f"No presets for module '{module_type}'.")

    module_presets = PRESETS[module_type]

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
    if module_type == "dp":
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

    # Graph: algorithm_key maps to a category tag, filter presets by tag
    category = ALGORITHM_CATEGORY.get(algorithm_key)
    if category is None:
        raise NotFoundException(
            f"No presets for algorithm '{algorithm_key}' in module '{module_type}'."
        )

    groups = []
    for gk, presets in module_presets.items():
        # Include presets that match the category tag, or have no tags (available to all algorithms)
        filtered = [
            p for p in presets
            if not p.get("tags") or category in p["tags"]
        ]
        if filtered:
            groups.append(
                PresetGroup(
                    group_key = gk,
                    presets = [PresetItem(**p) for p in filtered],
                )
            )

    return PresetsResponse(module_type = module_type, groups = groups)
