import time

from pydantic import ValidationError

from app.simulation.contract import BaseAlgorithm
from app.simulation.registry import register
from app.simulation.types import AlgorithmInput, AlgorithmOutput
from app.schemas.timeline import TimelineStep, HighlightedEntity
from app.schemas.payloads import SortingInputPayload, SearchingEvents
from app.simulation.explanation_builder import ExplanationBuilder
from app.exceptions import DomainError


@register("sorting", "binary_search")
class BinarySearchAlgorithm(BaseAlgorithm):
    @property
    def module_type(self) -> str:
        return "sorting"

    @property
    def algorithm_key(self) -> str:
        return "binary_search"


    def run(self, algo_input: AlgorithmInput) -> AlgorithmOutput:
        eb = ExplanationBuilder(algo_input.explanation_level)
        benchmark_mode = algo_input.execution_mode == "benchmark"

        # parse + validate
        try:
            sorting_input = SortingInputPayload.model_validate(algo_input.input_payload)

        except ValidationError as e:
            raise DomainError("Invalid sorting input.", details = {"errors": e.errors()})

        arr = list(sorting_input.array)
        n = len(arr)
        target = sorting_input.target

        # simulation state
        element_states = ["default"] * n
        steps: list[TimelineStep] = []
        metrics = {
            "comparisons": 0,
            "array_accesses": 0,
            "iterations": 0,
            "array_length": n,
        }


        def add_step(event_type, highlighted, explanation, search_low = None, search_mid = None, search_high = None, found_index = None, pseudocode_lines: list[int] | None = None):
            if benchmark_mode:
                return

            s_payload = {
                "array": list(arr),
                "element_states": list(element_states),
                "comparing": [],
                "swapping": [],
                "pivot_index": None,
                "sorted_boundary": None,
                "search_low": search_low,
                "search_mid": search_mid,
                "search_high": search_high,
                "search_target": target,
                "found_index": found_index,
                "pseudocode_lines": pseudocode_lines or [],
            }

            step = TimelineStep(
                step_index = len(steps),
                event_type = event_type,
                state_payload = s_payload,
                highlighted_entities = highlighted,
                metrics_snapshot = dict(metrics),
                explanation = explanation,
                timestamp_or_order = len(steps),
            )

            steps.append(step)


        # INITIALIZE
        highlighted_entities = [HighlightedEntity(id = list(range(n)), state = "default")]
        add_step(
            SearchingEvents.INITIALIZE,
            highlighted_entities,
            eb.build(
                title = "Initialize Binary Search",
                body = f"Search for target = {target} in {n} sorted elements.",
                data_snapshot = {"array": list(arr), "low": 0, "high": n - 1, "mid": None, "mid_value": None, "target": target, "comparisons": 0},
            ),
            pseudocode_lines = [0, 1],
        )


        # binary search
        t_start = time.perf_counter()

        low = 0
        high = n - 1
        found_idx = None

        while low <= high:
            metrics["iterations"] += 1
            mid = (low + high) // 2

            # mark states: frontier for [low, high], active for mid, default outside
            for k in range(n):
                if k == mid:
                    element_states[k] = "active"
                elif low <= k <= high:
                    element_states[k] = "frontier"
                else:
                    element_states[k] = "default"

            highlighted = [
                HighlightedEntity(id = list(range(low, mid)), state = "frontier"),
                HighlightedEntity(id = mid, state = "active", label = str(arr[mid])),
                HighlightedEntity(id = list(range(mid + 1, high + 1)), state = "frontier"),
            ]
            add_step(
                SearchingEvents.SET_RANGE,
                highlighted,
                eb.build(
                    title = f"Check mid = {mid}",
                    body = f"Range [{low}..{high}], mid = {mid}, arr[{mid}] = {arr[mid]}.",
                    data_snapshot = {"array": list(arr), "low": low, "high": high, "mid": mid, "mid_value": arr[mid], "target": target, "comparisons": metrics["comparisons"]},
                ),
                search_low = low,
                search_mid = mid,
                search_high = high,
                pseudocode_lines = [2, 3],
            )

            metrics["comparisons"] += 1
            metrics["array_accesses"] += 1

            if arr[mid] == target:
                element_states[mid] = "success"
                found_idx = mid
                add_step(
                    SearchingEvents.FOUND,
                    [HighlightedEntity(id = mid, state = "success", label = str(arr[mid]))],
                    eb.build(
                        title = f"Found target at index {mid}",
                        body = f"arr[{mid}] = {arr[mid]} matches target {target}. {metrics['comparisons']} comparisons.",
                        data_snapshot = {"array": list(arr), "low": low, "high": high, "mid": mid, "mid_value": arr[mid], "target": target, "comparisons": metrics["comparisons"]},
                    ),
                    search_low = low,
                    search_mid = mid,
                    search_high = high,
                    found_index = mid,
                    pseudocode_lines = [4, 5],
                )
                break

            elif arr[mid] < target:
                # target is in the right half — mark [low, mid] as visited
                for k in range(low, mid + 1):
                    element_states[k] = "visited"

                add_step(
                    SearchingEvents.NARROW_LEFT,
                    [
                        HighlightedEntity(id = list(range(low, mid + 1)), state = "visited"),
                        HighlightedEntity(id = list(range(mid + 1, high + 1)), state = "frontier"),
                    ],
                    eb.build(
                        title = f"Discard left half",
                        body = f"arr[{mid}] = {arr[mid]} < target {target}. Search [{mid + 1}..{high}].",
                        data_snapshot = {"array": list(arr), "low": low, "high": high, "mid": mid, "mid_value": arr[mid], "target": target, "comparisons": metrics["comparisons"]},
                    ),
                    search_low = low,
                    search_mid = mid,
                    search_high = high,
                    pseudocode_lines = [6, 7],
                )
                low = mid + 1

            else:
                # target is in the left half — mark [mid, high] as visited
                for k in range(mid, high + 1):
                    element_states[k] = "visited"

                add_step(
                    SearchingEvents.NARROW_RIGHT,
                    [
                        HighlightedEntity(id = list(range(low, mid)), state = "frontier"),
                        HighlightedEntity(id = list(range(mid, high + 1)), state = "visited"),
                    ],
                    eb.build(
                        title = f"Discard right half",
                        body = f"arr[{mid}] = {arr[mid]} > target {target}. Search [{low}..{mid - 1}].",
                        data_snapshot = {"array": list(arr), "low": low, "high": high, "mid": mid, "mid_value": arr[mid], "target": target, "comparisons": metrics["comparisons"]},
                    ),
                    search_low = low,
                    search_mid = mid,
                    search_high = high,
                    pseudocode_lines = [8],
                )
                high = mid - 1

        t_end = time.perf_counter()
        metrics["runtime_ms"] = round((t_end - t_start) * 1000, 3)


        if found_idx is None:
            # reset all states to default for NOT_FOUND
            for k in range(n):
                element_states[k] = "default"

            add_step(
                SearchingEvents.NOT_FOUND,
                [HighlightedEntity(id = list(range(n)), state = "default")],
                eb.build(
                    title = "Target not found",
                    body = f"Target {target} not found. Search exhausted after {metrics['comparisons']} comparisons.",
                    data_snapshot = {"array": list(arr), "low": low, "high": high, "mid": None, "mid_value": None, "target": target, "comparisons": metrics["comparisons"]},
                ),
                pseudocode_lines = [9],
            )


        # COMPLETE
        for k in range(n):
            if k == found_idx:
                element_states[k] = "success"
            elif element_states[k] != "success":
                element_states[k] = "default"

        complete_body = (
            (f"Found {target} at index {found_idx}." if found_idx is not None else f"{target} not in array.")
            + f" {metrics['comparisons']} comparisons, {metrics['iterations']} iterations."
        )

        add_step(
            SearchingEvents.COMPLETE,
            [HighlightedEntity(id = list(range(n)), state = "success" if found_idx is not None else "default")],
            eb.build(
                title = "Binary Search complete",
                body = complete_body,
                data_snapshot = {"array": list(arr), "low": 0, "high": n - 1, "mid": found_idx, "mid_value": arr[found_idx] if found_idx is not None else None, "target": target, "comparisons": metrics["comparisons"]},
            ),
            found_index = found_idx,
            pseudocode_lines = [0],
        )


        # return
        final_result = {
            "found": found_idx is not None,
            "found_index": found_idx,
            "target": target,
            "comparisons": metrics["comparisons"],
            "iterations": metrics["iterations"],
        }

        alg_metadata = self.build_metadata(algo_input) | {
            "time_complexity": "O(log n)",
            "space_complexity": "O(1)",
            "requires_sorted": True,
            "array_size": n,
        }

        return AlgorithmOutput(
            timeline_steps = steps,
            final_result = final_result,
            summary_metrics = metrics,
            algorithm_metadata = alg_metadata,
        )
