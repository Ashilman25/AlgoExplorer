import time

from pydantic import ValidationError

from app.simulation.contract import BaseAlgorithm
from app.simulation.registry import register
from app.simulation.types import AlgorithmInput, AlgorithmOutput
from app.schemas.timeline import TimelineStep, HighlightedEntity
from app.schemas.payloads import SortingInputPayload, SortingEvents
from app.exceptions import DomainError


@register("sorting", "heap_sort")
class HeapSortAlgorithm(BaseAlgorithm):
    @property
    def module_type(self) -> str:
        return "sorting"

    @property
    def algorithm_key(self) -> str:
        return "heap_sort"


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
            "heapify_ops": 0,
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


        def sift_down(heap_size, root, sorted_boundary):
            metrics["heapify_ops"] += 1

            largest = root
            left = 2 * root + 1
            right = 2 * root + 2

            if left < heap_size:
                metrics["comparisons"] += 1
                metrics["array_accesses"] += 2
                if arr[left] > arr[largest]:
                    largest = left

            if right < heap_size:
                metrics["comparisons"] += 1
                metrics["array_accesses"] += 2
                if arr[right] > arr[largest]:
                    largest = right

            if largest != root:
                # emit COMPARE before the swap
                element_states[root] = "frontier"
                element_states[largest] = "frontier"

                add_step(
                    SortingEvents.COMPARE,
                    [
                        HighlightedEntity(id = root, state = "frontier", label = str(arr[root])),
                        HighlightedEntity(id = largest, state = "frontier", label = str(arr[largest])),
                    ],
                    f"arr[{root}] = {arr[root]} < arr[{largest}] = {arr[largest]}. Swap to restore heap property.",
                    comparing = [root, largest],
                    sorted_boundary = sorted_boundary,
                    pseudocode_lines = [6, 7, 8, 9, 10, 11, 12],
                )

                # SWAP
                metrics["swaps"] += 1
                metrics["array_accesses"] += 2
                element_states[root] = "swap"
                element_states[largest] = "swap"
                arr[root], arr[largest] = arr[largest], arr[root]

                add_step(
                    SortingEvents.SWAP,
                    [
                        HighlightedEntity(id = root, state = "swap", label = str(arr[root])),
                        HighlightedEntity(id = largest, state = "swap", label = str(arr[largest])),
                    ],
                    f"Swap arr[{root}] ↔ arr[{largest}].",
                    swapping = [root, largest],
                    sorted_boundary = sorted_boundary,
                    pseudocode_lines = [13],
                )

                # reset states respecting sorted boundary
                element_states[root] = "default" if root < sorted_boundary else "success"
                element_states[largest] = "default" if largest < sorted_boundary else "success"

                # recurse on the child that was swapped into
                sift_down(heap_size, largest, sorted_boundary)


        # INITIALIZE
        highlighted_entities = [HighlightedEntity(id = list(range(n)), state = "default")]
        message = (
            f"Initialize Heap Sort on {n} elements. "
            f"Phase 1: build a max-heap. Phase 2: repeatedly extract the max."
        )
        add_step(SortingEvents.INITIALIZE, highlighted_entities, message, pseudocode_lines = [0, 1])


        t_start = time.perf_counter()

        # Phase 1 — Build max heap
        for i in range(n // 2 - 1, -1, -1):
            sift_down(n, i, n)

        # Phase 2 — Extract max repeatedly
        for i in range(n - 1, 0, -1):
            # swap root (max) with last unsorted element
            metrics["swaps"] += 1
            metrics["array_accesses"] += 2
            element_states[0] = "swap"
            element_states[i] = "swap"
            arr[0], arr[i] = arr[i], arr[0]

            add_step(
                SortingEvents.SWAP,
                [
                    HighlightedEntity(id = 0, state = "swap", label = str(arr[0])),
                    HighlightedEntity(id = i, state = "swap", label = str(arr[i])),
                ],
                f"Extract max {arr[i]}: swap arr[0] ↔ arr[{i}].",
                swapping = [0, i],
                sorted_boundary = i,
                pseudocode_lines = [2, 3],
            )

            # mark extracted element as sorted
            element_states[i] = "success"
            element_states[0] = "default"

            add_step(
                SortingEvents.MARK_SORTED,
                [HighlightedEntity(id = i, state = "success", label = str(arr[i]))],
                f"arr[{i}] = {arr[i]} is now in its final sorted position.",
                sorted_boundary = i,
                pseudocode_lines = [4],
            )

            # restore heap property on reduced heap
            sift_down(i, 0, i)

        t_end = time.perf_counter()
        metrics["runtime_ms"] = round((t_end - t_start) * 1000, 3)

        # mark the final remaining element as sorted
        element_states[0] = "success"

        # COMPLETE
        for k in range(n):
            element_states[k] = "success"

        sorted_vals = ", ".join(str(x) for x in arr)

        add_step(
            SortingEvents.COMPLETE,
            [HighlightedEntity(id = list(range(n)), state = "success")],
            f"Heap Sort complete! Sorted: [{sorted_vals}]. "
            f"{metrics['comparisons']} comparisons, {metrics['swaps']} swaps, "
            f"{metrics['heapify_ops']} heapify operations.",
            pseudocode_lines = [0],
        )


        # return
        final_result = {
            "sorted_array": list(arr),
            "comparisons": metrics["comparisons"],
            "swaps": metrics["swaps"],
            "heapify_ops": metrics["heapify_ops"],
        }

        alg_metadata = self.build_metadata(algo_input) | {
            "time_complexity": "O(n log n) all cases",
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
