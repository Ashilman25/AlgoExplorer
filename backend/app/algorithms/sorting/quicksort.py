import time

from pydantic import ValidationError

from app.simulation.contract import BaseAlgorithm
from app.simulation.registry import register
from app.simulation.types import AlgorithmInput, AlgorithmOutput
from app.schemas.timeline import TimelineStep, HighlightedEntity
from app.schemas.payloads import SortingInputPayload, SortingEvents
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
            "writes": 0,
            "array_accesses": 0,
            "recursion_depth": 0,
            "max_recursion_depth": 0,
            "array_length": n,
        }


        def add_step(event_type, highlighted, explanation, comparing = None, swapping = None, pivot_index = None):
            if benchmark_mode:
                return

            s_payload = {
                "array": list(arr),
                "element_states": list(element_states),
                "comparing": list(comparing) if comparing else [],
                "swapping": list(swapping) if swapping else [],
                "pivot_index": pivot_index,
                "sorted_boundary": None,
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
        
        #initial step info
        highlighted_entities = [HighlightedEntity(id = list(range(n)), state = "default")]
        message = (
            f"Initialize Quick Sort on {n} elements. "
            f"Using Lomuto partition (last element as pivot)."
        )
        add_step(SortingEvents.INITIALIZE, highlighted_entities, message)
        

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
                    f"Single element arr[{low}] = {arr[low]} is in its sorted position.",
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
            message = (
                f"Partition [{low}..{high}]: [{subarray_vals}] "
                f"({high - low + 1} elements, depth {depth})."
            )
            add_step(SortingEvents.PARTITION_START, highlighted_entities, message)


            # SET_PIVOT
            pivot_val = arr[high]
            pivot_pos = high
            element_states[pivot_pos] = "source"
            metrics["array_accesses"] += 1

            add_step(
                SortingEvents.SET_PIVOT,
                [HighlightedEntity(id = pivot_pos, state = "source", label = str(pivot_val))],
                f"Choose pivot = arr[{pivot_pos}] = {pivot_val}.",
                pivot_index = pivot_pos,
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
                            f"arr[{j}] = {arr[j]} ≤ pivot {pivot_val}. Swap with arr[{i}] = {arr[i]}.",
                            comparing = [j, pivot_pos],
                            pivot_index = pivot_pos,
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
                            f"Swap arr[{i}] ↔ arr[{j}].",
                            swapping = [i, j],
                            pivot_index = pivot_pos,
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
                            f"arr[{j}] = {arr[j]} ≤ pivot {pivot_val}. Already in left partition.",
                            comparing = [j, pivot_pos],
                            pivot_index = pivot_pos,
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
                        f"arr[{j}] = {arr[j]} > pivot {pivot_val}. Stays in right partition.",
                        comparing = [j, pivot_pos],
                        pivot_index = pivot_pos,
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
                    f"Place pivot {pivot_val} into its final position arr[{final_pivot_pos}].",
                    swapping = [final_pivot_pos, high],
                    pivot_index = final_pivot_pos,
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
                f"Partition complete. Pivot {pivot_val} is sorted at index {final_pivot_pos}. "
                f"Left: {left_size} element(s), Right: {right_size} element(s).",
                pivot_index = final_pivot_pos,
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
            f"Quick Sort complete! Sorted: [{sorted_vals}]. "
            f"{metrics['comparisons']} comparisons, {metrics['swaps']} swaps, "
            f"max depth {metrics['max_recursion_depth']}.",
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
