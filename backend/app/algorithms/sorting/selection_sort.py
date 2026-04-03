import time

from pydantic import ValidationError

from app.simulation.contract import BaseAlgorithm
from app.simulation.registry import register
from app.simulation.types import AlgorithmInput, AlgorithmOutput
from app.schemas.timeline import TimelineStep, HighlightedEntity
from app.schemas.payloads import SortingInputPayload, SortingEvents
from app.simulation.explanation_builder import ExplanationBuilder
from app.exceptions import DomainError


@register("sorting", "selection_sort")
class SelectionSortAlgorithm(BaseAlgorithm):
    @property
    def module_type(self) -> str:
        return "sorting"

    @property
    def algorithm_key(self) -> str:
        return "selection_sort"


    def run(self, algo_input: AlgorithmInput) -> AlgorithmOutput:
        eb = ExplanationBuilder(algo_input.explanation_level)
        benchmark_mode = algo_input.execution_mode == "benchmark"

        # parse + validate
        try:
            sorting_input = SortingInputPayload.model_validate(algo_input.input_payload)

        except ValidationError as e:
            raise DomainError("Invalid sorting input.", details = {"errors": e.errors()})

        if benchmark_mode:
            arr = list(sorting_input.array)
            n = len(arr)
            comparisons = 0
            swaps = 0

            for i in range(n - 1):
                min_idx = i
                for j in range(i + 1, n):
                    comparisons += 1
                    if arr[j] < arr[min_idx]:
                        min_idx = j
                if min_idx != i:
                    arr[i], arr[min_idx] = arr[min_idx], arr[i]
                    swaps += 1

            metrics = {
                "comparisons": comparisons,
                "swaps": swaps,
                "array_accesses": 0,
                "array_length": n,
            }

            return AlgorithmOutput(
                timeline_steps = [],
                final_result = {"sorted_array": arr},
                summary_metrics = metrics,
                algorithm_metadata = self.build_metadata(algo_input) | {
                    "time_complexity": "O(n²) all cases",
                    "space_complexity": "O(1)",
                    "stable": False,
                    "array_size": n,
                },
            )

        arr = list(sorting_input.array)
        n = len(arr)

        # simulation state
        element_states = ["default"] * n
        steps: list[TimelineStep] = []
        metrics = {
            "comparisons": 0,
            "swaps": 0,
            "array_accesses": 0,
            "array_length": n,
        }


        def add_step(event_type, highlighted, explanation, comparing = None, swapping = None, sorted_boundary = None, pseudocode_lines: list[int] | None = None):
            if benchmark_mode:
                return

            s_payload = {
                "array": list(arr),
                "element_states": list(element_states),
                "comparing": list(comparing) if comparing else [],
                "swapping": list(swapping) if swapping else [],
                "pivot_index": None,
                "sorted_boundary": sorted_boundary,
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
            SortingEvents.INITIALIZE,
            highlighted_entities,
            eb.build(
                title = "Initialize Selection Sort",
                body = f"Begin Selection Sort on {n} elements. Find minimum of unsorted portion each pass.",
                data_snapshot = {"array": list(arr), "comparisons": 0, "swaps": 0, "current_min_index": None, "current_min_value": None, "scan_range": [0, n - 1]},
            ),
            pseudocode_lines = [0],
        )


        # run the sort
        t_start = time.perf_counter()

        for i in range(n - 1):
            min_idx = i
            element_states[min_idx] = "source"

            add_step(
                SortingEvents.COMPARE,
                [HighlightedEntity(id = i, state = "source", label = str(arr[i]))],
                eb.build(
                    title = f"Pass {i + 1}: scan from index {i}",
                    body = f"Current minimum candidate: arr[{i}] = {arr[i]}.",
                    data_snapshot = {"array": list(arr), "comparisons": metrics["comparisons"], "swaps": metrics["swaps"], "current_min_index": i, "current_min_value": arr[i], "scan_range": [i, n - 1]},
                ),
                comparing = [i],
                sorted_boundary = i,
                pseudocode_lines = [1, 2],
            )

            for j in range(i + 1, n):
                metrics["comparisons"] += 1
                metrics["array_accesses"] += 2

                element_states[j] = "frontier"

                if arr[j] < arr[min_idx]:
                    # reset old minimum back to default
                    if min_idx != i:
                        element_states[min_idx] = "default"
                    else:
                        element_states[min_idx] = "source"

                    old_min_idx = min_idx
                    min_idx = j
                    element_states[min_idx] = "source"

                    add_step(
                        SortingEvents.COMPARE,
                        [
                            HighlightedEntity(id = j, state = "source", label = str(arr[j])),
                            HighlightedEntity(id = old_min_idx, state = "default", label = str(arr[old_min_idx])),
                        ],
                        eb.build(
                            title = f"New min at arr[{j}] = {arr[j]}",
                            body = f"arr[{j}] = {arr[j]} < old min arr[{old_min_idx}] = {arr[old_min_idx]}. {metrics['comparisons']} comparisons.",
                            data_snapshot = {"array": list(arr), "comparisons": metrics["comparisons"], "swaps": metrics["swaps"], "current_min_index": j, "current_min_value": arr[j], "scan_range": [i, n - 1]},
                        ),
                        comparing = [j, old_min_idx],
                        sorted_boundary = i,
                        pseudocode_lines = [3, 4, 5],
                    )

                else:
                    add_step(
                        SortingEvents.COMPARE,
                        [
                            HighlightedEntity(id = j, state = "frontier", label = str(arr[j])),
                            HighlightedEntity(id = min_idx, state = "source", label = str(arr[min_idx])),
                        ],
                        eb.build(
                            title = f"Compare arr[{j}] and min",
                            body = f"arr[{j}] = {arr[j]} >= min arr[{min_idx}] = {arr[min_idx]}. Minimum unchanged.",
                            data_snapshot = {"array": list(arr), "comparisons": metrics["comparisons"], "swaps": metrics["swaps"], "current_min_index": min_idx, "current_min_value": arr[min_idx], "scan_range": [i, n - 1]},
                        ),
                        comparing = [j, min_idx],
                        sorted_boundary = i,
                        pseudocode_lines = [3, 4],
                    )

                    element_states[j] = "default"

            # after scan: swap if needed
            if min_idx != i:
                metrics["swaps"] += 1
                metrics["array_accesses"] += 2

                element_states[i] = "swap"
                element_states[min_idx] = "swap"
                arr[i], arr[min_idx] = arr[min_idx], arr[i]

                add_step(
                    SortingEvents.SWAP,
                    [
                        HighlightedEntity(id = i, state = "swap", label = str(arr[i])),
                        HighlightedEntity(id = min_idx, state = "swap", label = str(arr[min_idx])),
                    ],
                    eb.build(
                        title = f"Swap arr[{i}] and arr[{min_idx}]",
                        body = f"Place minimum {arr[i]} into sorted position {i}. {metrics['swaps']} swaps so far.",
                        data_snapshot = {"array": list(arr), "comparisons": metrics["comparisons"], "swaps": metrics["swaps"], "current_min_index": min_idx, "current_min_value": arr[min_idx], "scan_range": [i, n - 1]},
                    ),
                    swapping = [i, min_idx],
                    sorted_boundary = i,
                    pseudocode_lines = [6],
                )

            # reset unsorted states to default, mark position i as success
            for k in range(i + 1, n):
                if element_states[k] != "success":
                    element_states[k] = "default"

            element_states[i] = "success"

            add_step(
                SortingEvents.MARK_SORTED,
                [HighlightedEntity(id = i, state = "success", label = str(arr[i]))],
                eb.build(
                    title = f"Mark arr[{i}] sorted",
                    body = f"arr[{i}] = {arr[i]} is in its final sorted position.",
                    data_snapshot = {"array": list(arr), "comparisons": metrics["comparisons"], "swaps": metrics["swaps"], "current_min_index": i, "current_min_value": arr[i], "scan_range": [i + 1, n - 1]},
                ),
                sorted_boundary = i + 1,
                pseudocode_lines = [1],
            )

        # mark the last element as success
        element_states[n - 1] = "success"

        t_end = time.perf_counter()
        metrics["runtime_ms"] = round((t_end - t_start) * 1000, 3)


        # COMPLETE
        sorted_vals = ", ".join(str(x) for x in arr)

        add_step(
            SortingEvents.COMPLETE,
            [HighlightedEntity(id = list(range(n)), state = "success")],
            eb.build(
                title = "Selection Sort complete",
                body = f"{metrics['comparisons']} comparisons, {metrics['swaps']} swaps.",
                data_snapshot = {"array": list(arr), "comparisons": metrics["comparisons"], "swaps": metrics["swaps"], "current_min_index": None, "current_min_value": None, "scan_range": [n - 1, n - 1]},
            ),
            pseudocode_lines = [7],
        )


        # return
        final_result = {
            "sorted_array": list(arr),
            "comparisons": metrics["comparisons"],
            "swaps": metrics["swaps"],
        }

        alg_metadata = self.build_metadata(algo_input) | {
            "time_complexity": "O(n²) all cases",
            "space_complexity": "O(1)",
            "stable": False,
            "array_size": n,
        }

        return AlgorithmOutput(
            timeline_steps = steps,
            final_result = final_result,
            summary_metrics = metrics,
            algorithm_metadata = alg_metadata,
        )
