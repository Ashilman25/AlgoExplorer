import time

from pydantic import ValidationError

from app.simulation.contract import BaseAlgorithm
from app.simulation.registry import register
from app.simulation.types import AlgorithmInput, AlgorithmOutput
from app.schemas.timeline import TimelineStep, HighlightedEntity
from app.schemas.payloads import SortingInputPayload, SortingEvents
from app.exceptions import DomainError


@register("sorting", "bubble_sort")
class BubbleSortAlgorithm(BaseAlgorithm):
    @property
    def module_type(self) -> str:
        return "sorting"

    @property
    def algorithm_key(self) -> str:
        return "bubble_sort"


    def run(self, algo_input: AlgorithmInput) -> AlgorithmOutput:
        explain = algo_input.explanation_level
        benchmark_mode = algo_input.execution_mode == "benchmark"

        # parse + validate
        try:
            sorting_input = SortingInputPayload.model_validate(algo_input.input_payload)

        except ValidationError as e:
            raise DomainError("Invalid sorting input.", details = {"errors": e.errors()})

        arr = list(sorting_input.array)
        n = len(arr)

        # simulation state
        element_states = ["default"] * n
        steps: list[TimelineStep] = []
        metrics = {
            "comparisons": 0,
            "swaps": 0,
            "array_accesses": 0,
            "passes": 0,
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
                explanation = explanation if explain != "none" else None,
                timestamp_or_order = len(steps),
            )

            steps.append(step)


        # INITIALIZE
        highlighted_entities = [HighlightedEntity(id = list(range(n)), state = "default")]
        message = (
            f"Initialize Bubble Sort on {n} elements. "
            f"Repeatedly compare adjacent pairs, bubbling the largest to the end."
        )
        add_step(SortingEvents.INITIALIZE, highlighted_entities, message, pseudocode_lines = [0, 1])


        # run the sort
        t_start = time.perf_counter()

        for i in range(n - 1, 0, -1):
            metrics["passes"] += 1
            swapped_this_pass = False

            for j in range(0, i):
                metrics["comparisons"] += 1
                metrics["array_accesses"] += 2

                element_states[j] = "frontier"
                element_states[j + 1] = "frontier"

                if arr[j] > arr[j + 1]:
                    # COMPARE — swap needed
                    add_step(
                        SortingEvents.COMPARE,
                        [
                            HighlightedEntity(id = j, state = "frontier", label = str(arr[j])),
                            HighlightedEntity(id = j + 1, state = "frontier", label = str(arr[j + 1])),
                        ],
                        f"Compare arr[{j}] = {arr[j]} > arr[{j + 1}] = {arr[j + 1]}. Swap needed.",
                        comparing = [j, j + 1],
                        pseudocode_lines = [4, 5],
                    )

                    # SWAP
                    metrics["swaps"] += 1
                    metrics["array_accesses"] += 2
                    element_states[j] = "swap"
                    element_states[j + 1] = "swap"
                    arr[j], arr[j + 1] = arr[j + 1], arr[j]
                    swapped_this_pass = True

                    add_step(
                        SortingEvents.SWAP,
                        [
                            HighlightedEntity(id = j, state = "swap", label = str(arr[j])),
                            HighlightedEntity(id = j + 1, state = "swap", label = str(arr[j + 1])),
                        ],
                        f"Swap arr[{j}] ↔ arr[{j + 1}].",
                        swapping = [j, j + 1],
                        pseudocode_lines = [6, 7],
                    )

                    element_states[j] = "active"
                    element_states[j + 1] = "active"

                else:
                    # COMPARE — no swap needed
                    add_step(
                        SortingEvents.COMPARE,
                        [
                            HighlightedEntity(id = j, state = "frontier", label = str(arr[j])),
                            HighlightedEntity(id = j + 1, state = "frontier", label = str(arr[j + 1])),
                        ],
                        f"Compare arr[{j}] = {arr[j]} ≤ arr[{j + 1}] = {arr[j + 1]}. No swap needed.",
                        comparing = [j, j + 1],
                        pseudocode_lines = [4, 5],
                    )

                    element_states[j] = "active"
                    element_states[j + 1] = "active"

            # after this pass, arr[i] is in its sorted position
            element_states[i] = "success"

            add_step(
                SortingEvents.MARK_SORTED,
                [HighlightedEntity(id = i, state = "success", label = str(arr[i]))],
                f"Pass {metrics['passes']} complete. arr[{i}] = {arr[i]} is in its sorted position.",
                sorted_boundary = i,
                pseudocode_lines = [2],
            )

            # early termination: if no swaps occurred, the array is already sorted
            if not swapped_this_pass:
                for k in range(0, i):
                    element_states[k] = "success"

                add_step(
                    SortingEvents.MARK_SORTED,
                    [HighlightedEntity(id = list(range(0, i)), state = "success")],
                    f"No swaps in pass {metrics['passes']}. Array is sorted early — remaining elements are in place.",
                    sorted_boundary = 0,
                    pseudocode_lines = [8],
                )
                break

        t_end = time.perf_counter()
        metrics["runtime_ms"] = round((t_end - t_start) * 1000, 3)

        # first element is always sorted after the loop ends
        element_states[0] = "success"

        # COMPLETE
        for k in range(n):
            element_states[k] = "success"

        sorted_vals = ", ".join(str(x) for x in arr)

        add_step(
            SortingEvents.COMPLETE,
            [HighlightedEntity(id = list(range(n)), state = "success")],
            f"Bubble Sort complete! Sorted: [{sorted_vals}]. "
            f"{metrics['comparisons']} comparisons, {metrics['swaps']} swaps, "
            f"{metrics['passes']} passes.",
            pseudocode_lines = [9],
        )


        # return
        final_result = {
            "sorted_array": list(arr),
            "comparisons": metrics["comparisons"],
            "swaps": metrics["swaps"],
            "passes": metrics["passes"],
        }

        alg_metadata = self.build_metadata(algo_input) | {
            "time_complexity": "O(n²) average/worst, O(n) best",
            "space_complexity": "O(1)",
            "stable": True,
            "early_termination": True,
            "array_size": n,
        }

        return AlgorithmOutput(
            timeline_steps = steps,
            final_result = final_result,
            summary_metrics = metrics,
            algorithm_metadata = alg_metadata,
        )
