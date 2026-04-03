import time

from pydantic import ValidationError

from app.simulation.contract import BaseAlgorithm
from app.simulation.registry import register
from app.simulation.types import AlgorithmInput, AlgorithmOutput
from app.schemas.timeline import TimelineStep, HighlightedEntity
from app.schemas.payloads import SortingInputPayload, SortingEvents
from app.simulation.explanation_builder import ExplanationBuilder
from app.exceptions import DomainError


@register("sorting", "quicksort")
class QuickSortAlgorithm(BaseAlgorithm):
    @property
    def module_type(self) -> str:
        return "sorting"

    @property
    def algorithm_key(self) -> str:
        return "quicksort"


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
            writes = 0
            max_depth = 0

            def qs(low, high, depth):
                nonlocal comparisons, swaps, writes, max_depth
                if depth > max_depth:
                    max_depth = depth
                if low >= high:
                    return
                pivot = arr[high]
                i = low - 1
                for j in range(low, high):
                    comparisons += 1
                    if arr[j] <= pivot:
                        i += 1
                        if i != j:
                            arr[i], arr[j] = arr[j], arr[i]
                            swaps += 1
                final_pos = i + 1
                if final_pos != high:
                    arr[final_pos], arr[high] = arr[high], arr[final_pos]
                    swaps += 1
                qs(low, final_pos - 1, depth + 1)
                qs(final_pos + 1, high, depth + 1)

            qs(0, n - 1, 0)

            metrics = {
                "comparisons": comparisons,
                "swaps": swaps,
                "writes": writes,
                "array_accesses": 0,
                "recursion_depth": 0,
                "max_recursion_depth": max_depth,
                "array_length": n,
                "runtime_ms": 0,
            }

            return AlgorithmOutput(
                timeline_steps = [],
                final_result = {
                    "sorted_array": arr,
                    "comparisons": comparisons,
                    "swaps": swaps,
                    "max_recursion_depth": max_depth,
                },
                summary_metrics = metrics,
                algorithm_metadata = self.build_metadata(algo_input) | {
                    "time_complexity": "O(n log n) average, O(n²) worst",
                    "space_complexity": "O(log n) average",
                    "partition_scheme": "lomuto",
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
            "writes": 0,
            "array_accesses": 0,
            "recursion_depth": 0,
            "max_recursion_depth": 0,
            "array_length": n,
        }


        def add_step(event_type, highlighted, explanation, comparing = None, swapping = None, pivot_index = None, pseudocode_lines: list[int] | None = None):
            if benchmark_mode:
                return

            s_payload = {
                "array": list(arr),
                "element_states": list(element_states),
                "comparing": list(comparing) if comparing else [],
                "swapping": list(swapping) if swapping else [],
                "pivot_index": pivot_index,
                "sorted_boundary": None,
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
        
        #initial step info
        highlighted_entities = [HighlightedEntity(id = list(range(n)), state = "default")]
        add_step(
            SortingEvents.INITIALIZE,
            highlighted_entities,
            eb.build(
                title = "Initialize Quick Sort",
                body = f"Begin Quick Sort on {n} elements. Using Lomuto partition (last element as pivot).",
                data_snapshot = {"array": list(arr), "comparisons": 0, "swaps": 0},
            ),
            pseudocode_lines = [0],
        )
        

        def quicksort(low, high, depth):
            metrics["recursion_depth"] = depth
            if depth > metrics["max_recursion_depth"]:
                metrics["max_recursion_depth"] = depth

            if low > high:
                return

            if low == high:
                element_states[low] = "success"
                add_step(
                    SortingEvents.MARK_SORTED,
                    [HighlightedEntity(id = low, state = "success", label = str(arr[low]))],
                    eb.build(
                        title = f"Mark arr[{low}] sorted",
                        body = f"Single element arr[{low}] = {arr[low]} is in its sorted position.",
                        data_snapshot = {"array": list(arr), "comparisons": metrics["comparisons"], "swaps": metrics["swaps"], "range": [low, low], "pivot_value": None, "pivot_index": None, "depth": depth},
                    ),
                    pseudocode_lines = [1],
                )
                return


            # PARTITION_START — mark the working range as active
            for k in range(low, high + 1):
                if element_states[k] != "success":
                    element_states[k] = "active"
                    
            values = []
            for k in range(low, high + 1):
                value_string = str(arr[k])
                values.append(value_string)
                
            subarray_vals = ", ".join(values)
            highlighted_entities = [HighlightedEntity(id = list(range(low, high + 1)), state = "active")]
            add_step(
                SortingEvents.PARTITION_START,
                highlighted_entities,
                eb.build(
                    title = f"Partition [{low}..{high}]",
                    body = f"Begin partitioning {high - low + 1} elements at depth {depth}.",
                    data_snapshot = {"array": list(arr), "comparisons": metrics["comparisons"], "swaps": metrics["swaps"], "range": [low, high], "pivot_value": None, "pivot_index": None, "depth": depth},
                ),
                pseudocode_lines = [2, 6],
            )


            # SET_PIVOT
            pivot_val = arr[high]
            pivot_pos = high
            element_states[pivot_pos] = "source"
            metrics["array_accesses"] += 1

            add_step(
                SortingEvents.SET_PIVOT,
                [HighlightedEntity(id = pivot_pos, state = "source", label = str(pivot_val))],
                eb.build(
                    title = f"Set pivot arr[{pivot_pos}] = {pivot_val}",
                    body = f"Choose last element as pivot. Pivot value is {pivot_val}.",
                    data_snapshot = {"array": list(arr), "comparisons": metrics["comparisons"], "swaps": metrics["swaps"], "range": [low, high], "pivot_value": pivot_val, "pivot_index": pivot_pos, "depth": depth},
                ),
                pivot_index = pivot_pos,
                pseudocode_lines = [7, 8],
            )


            # Lomuto partition loop
            # i tracks the boundary of the "left" partition (elements <= pivot)
            # j scans left to right comparing each element to the pivot
            i = low - 1

            for j in range(low, high):
                metrics["comparisons"] += 1
                metrics["array_accesses"] += 1
                element_states[j] = "frontier"

                if arr[j] <= pivot_val:
                    i += 1

                    if i != j:
                        # COMPARE — element belongs in left partition, swap needed
                        add_step(
                            SortingEvents.COMPARE,
                            [
                                HighlightedEntity(id = j, state = "frontier", label = str(arr[j])),
                                HighlightedEntity(id = pivot_pos, state = "source", label = str(pivot_val)),
                            ],
                            eb.build(
                                title = f"Compare arr[{j}] and pivot",
                                body = f"arr[{j}] = {arr[j]} <= pivot {pivot_val}. Swap with arr[{i}] = {arr[i]}.",
                                data_snapshot = {"array": list(arr), "comparisons": metrics["comparisons"], "swaps": metrics["swaps"], "range": [low, high], "pivot_value": pivot_val, "pivot_index": pivot_pos, "depth": depth},
                            ),
                            comparing = [j, pivot_pos],
                            pivot_index = pivot_pos,
                            pseudocode_lines = [9, 10, 11],
                        )

                        # SWAP
                        metrics["swaps"] += 1
                        metrics["array_accesses"] += 2
                        element_states[i] = "swap"
                        element_states[j] = "swap"
                        arr[i], arr[j] = arr[j], arr[i]

                        add_step(
                            SortingEvents.SWAP,
                            [
                                HighlightedEntity(id = i, state = "swap", label = str(arr[i])),
                                HighlightedEntity(id = j, state = "swap", label = str(arr[j])),
                            ],
                            eb.build(
                                title = f"Swap arr[{i}] and arr[{j}]",
                                body = f"Swap arr[{i}] = {arr[i]} with arr[{j}] = {arr[j]}. {metrics['swaps']} swaps so far.",
                                data_snapshot = {"array": list(arr), "comparisons": metrics["comparisons"], "swaps": metrics["swaps"], "range": [low, high], "pivot_value": pivot_val, "pivot_index": pivot_pos, "depth": depth},
                            ),
                            swapping = [i, j],
                            pivot_index = pivot_pos,
                            pseudocode_lines = [12],
                        )

                        element_states[i] = "active"
                        element_states[j] = "active"

                    else:
                        # element already in the correct position within left partition
                        add_step(
                            SortingEvents.COMPARE,
                            [
                                HighlightedEntity(id = j, state = "frontier", label = str(arr[j])),
                                HighlightedEntity(id = pivot_pos, state = "source", label = str(pivot_val)),
                            ],
                            eb.build(
                                title = f"Compare arr[{j}] and pivot",
                                body = f"arr[{j}] = {arr[j]} <= pivot {pivot_val}. Already in left partition.",
                                data_snapshot = {"array": list(arr), "comparisons": metrics["comparisons"], "swaps": metrics["swaps"], "range": [low, high], "pivot_value": pivot_val, "pivot_index": pivot_pos, "depth": depth},
                            ),
                            comparing = [j, pivot_pos],
                            pivot_index = pivot_pos,
                            pseudocode_lines = [9, 10, 11],
                        )
                        element_states[j] = "active"

                else:
                    # element stays in right partition
                    add_step(
                        SortingEvents.COMPARE,
                        [
                            HighlightedEntity(id = j, state = "frontier", label = str(arr[j])),
                            HighlightedEntity(id = pivot_pos, state = "source", label = str(pivot_val)),
                        ],
                        eb.build(
                            title = f"Compare arr[{j}] and pivot",
                            body = f"arr[{j}] = {arr[j]} > pivot {pivot_val}. Stays in right partition.",
                            data_snapshot = {"array": list(arr), "comparisons": metrics["comparisons"], "swaps": metrics["swaps"], "range": [low, high], "pivot_value": pivot_val, "pivot_index": pivot_pos, "depth": depth},
                        ),
                        comparing = [j, pivot_pos],
                        pivot_index = pivot_pos,
                        pseudocode_lines = [9, 10],
                    )
                    element_states[j] = "active"


            # place the pivot into its final sorted position
            final_pivot_pos = i + 1

            if final_pivot_pos != high:
                metrics["swaps"] += 1
                metrics["array_accesses"] += 2
                element_states[final_pivot_pos] = "swap"
                element_states[high] = "swap"
                arr[final_pivot_pos], arr[high] = arr[high], arr[final_pivot_pos]

                add_step(
                    SortingEvents.SWAP,
                    [
                        HighlightedEntity(id = final_pivot_pos, state = "swap", label = str(arr[final_pivot_pos])),
                        HighlightedEntity(id = high, state = "swap", label = str(arr[high])),
                    ],
                    eb.build(
                        title = f"Place pivot at arr[{final_pivot_pos}]",
                        body = f"Pivot {pivot_val} placed into its final sorted position at index {final_pivot_pos}.",
                        data_snapshot = {"array": list(arr), "comparisons": metrics["comparisons"], "swaps": metrics["swaps"], "range": [low, high], "pivot_value": pivot_val, "pivot_index": final_pivot_pos, "depth": depth},
                    ),
                    swapping = [final_pivot_pos, high],
                    pivot_index = final_pivot_pos,
                    pseudocode_lines = [13, 14],
                )


            # pivot is now in its final sorted position
            element_states[final_pivot_pos] = "success"

            # reset non-sorted elements back to default before recursing
            for k in range(low, high + 1):
                if element_states[k] != "success":
                    element_states[k] = "default"

            left_size = final_pivot_pos - low
            right_size = high - final_pivot_pos

            add_step(
                SortingEvents.PARTITION_END,
                [HighlightedEntity(id = final_pivot_pos, state = "success", label = str(arr[final_pivot_pos]))],
                eb.build(
                    title = f"Partition complete at index {final_pivot_pos}",
                    body = f"Pivot {pivot_val} sorted at index {final_pivot_pos}. Left: {left_size}, Right: {right_size}.",
                    data_snapshot = {"array": list(arr), "comparisons": metrics["comparisons"], "swaps": metrics["swaps"], "range": [low, high], "pivot_value": pivot_val, "pivot_index": final_pivot_pos, "depth": depth},
                ),
                pivot_index = final_pivot_pos,
                pseudocode_lines = [3, 4],
            )

            # recurse into left then right partitions
            quicksort(low, final_pivot_pos - 1, depth + 1)
            quicksort(final_pivot_pos + 1, high, depth + 1)



        # run the sort
        t_start = time.perf_counter()
        quicksort(0, n - 1, 0)
        t_end = time.perf_counter()
        metrics["runtime_ms"] = round((t_end - t_start) * 1000, 3)


        # COMPLETE
        for k in range(n):
            element_states[k] = "success"

        sorted_vals = ", ".join(str(x) for x in arr)

        add_step(
            SortingEvents.COMPLETE,
            [HighlightedEntity(id = list(range(n)), state = "success")],
            eb.build(
                title = "Quick Sort complete",
                body = f"{metrics['comparisons']} comparisons, {metrics['swaps']} swaps, max depth {metrics['max_recursion_depth']}.",
                data_snapshot = {"array": list(arr), "comparisons": metrics["comparisons"], "swaps": metrics["swaps"], "range": [0, n - 1], "pivot_value": None, "pivot_index": None, "depth": 0},
            ),
            pseudocode_lines = [0],
        )


        # return
        final_result = {
            "sorted_array": list(arr),
            "comparisons": metrics["comparisons"],
            "swaps": metrics["swaps"],
            "max_recursion_depth": metrics["max_recursion_depth"],
        }

        alg_metadata = self.build_metadata(algo_input) | {
            "time_complexity": "O(n log n) average, O(n²) worst",
            "space_complexity": "O(log n) average",
            "partition_scheme": "lomuto",
            "array_size": n,
        }

        return AlgorithmOutput(
            timeline_steps = steps,
            final_result = final_result,
            summary_metrics = metrics,
            algorithm_metadata = alg_metadata,
        )
