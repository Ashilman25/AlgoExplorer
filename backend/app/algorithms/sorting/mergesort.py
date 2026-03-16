from pydantic import ValidationError

from app.simulation.contract import BaseAlgorithm
from app.simulation.registry import register
from app.simulation.types import AlgorithmInput, AlgorithmOutput
from app.schemas.timeline import TimelineStep, HighlightedEntity
from app.schemas.payloads import SortingInputPayload, SortingEvents
from app.exceptions import DomainError


@register("sorting", "mergesort")
class MergeSortAlgorithm(BaseAlgorithm):
    @property
    def module_type(self) -> str:
        return "sorting"

    @property
    def algorithm_key(self) -> str:
        return "mergesort"


    def run(self, algo_input: AlgorithmInput) -> AlgorithmOutput:
        explain = algo_input.explanation_level

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
        }


        def add_step(event_type, highlighted, explanation, comparing = None, swapping = None, pivot_index = None):
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
            f"Initialize Merge Sort on {n} elements. "
            f"Top-down divide-and-conquer: split, sort halves, merge."
        )
        add_step(SortingEvents.INITIALIZE, highlighted_entities, message)


        def mergesort(low, high, depth):
            metrics["recursion_depth"] = depth
            if depth > metrics["max_recursion_depth"]:
                metrics["max_recursion_depth"] = depth

            if low > high:
                return

            if low == high:
                element_states[low] = "visited"
                add_step(
                    SortingEvents.MARK_SORTED,
                    [HighlightedEntity(id = low, state = "visited", label = str(arr[low]))],
                    f"Single element arr[{low}] = {arr[low]} is trivially sorted.",
                )
                return


            mid = (low + high) // 2

            # PARTITION_START
            for k in range(low, high + 1):
                element_states[k] = "active"

            values = []
            for k in range(low, high + 1):
                values.append(str(arr[k]))
            subarray_vals = ", ".join(values)

            left_range = f"[{low}..{mid}]"
            right_range = f"[{mid + 1}..{high}]"

            highlighted_entities = [HighlightedEntity(id = list(range(low, high + 1)), state = "active")]
            message = (
                f"Split [{low}..{high}]: [{subarray_vals}] "
                f"into {left_range} and {right_range} (depth {depth})."
            )
            add_step(SortingEvents.PARTITION_START, highlighted_entities, message)

            # reset before recursing so children manage their own states
            for k in range(low, high + 1):
                element_states[k] = "default"

            mergesort(low, mid, depth + 1)
            mergesort(mid + 1, high, depth + 1)

            for k in range(low, high + 1):
                element_states[k] = "active"

            left_half = arr[low : mid + 1]
            right_half = arr[mid + 1 : high + 1]
            metrics["array_accesses"] += len(left_half) + len(right_half)

            i = 0   # pointer into left_half
            j = 0   # pointer into right_half
            k = low  # write position in arr


            # merge while both halves have elements
            while i < len(left_half) and j < len(right_half):
                left_val = left_half[i]
                right_val = right_half[j]
                left_idx = low + i
                right_idx = mid + 1 + j

                metrics["comparisons"] += 1
                metrics["array_accesses"] += 2

                if left_val <= right_val:
                    winner = left_val
                    message = (
                        f"Compare left {left_val} ≤ right {right_val}. "
                        f"Take {left_val} from left half."
                    )
                    i += 1
                else:
                    winner = right_val
                    message = (
                        f"Compare left {left_val} > right {right_val}. "
                        f"Take {right_val} from right half."
                    )
                    j += 1

                highlighted_entities = [
                    HighlightedEntity(id = left_idx, state = "frontier", label = str(left_val)),
                    HighlightedEntity(id = right_idx, state = "frontier", label = str(right_val)),
                ]
                add_step(
                    SortingEvents.COMPARE,
                    highlighted_entities,
                    message,
                    comparing = [left_idx, right_idx],
                )


                # MERGE
                arr[k] = winner
                metrics["writes"] += 1
                metrics["array_accesses"] += 1
                element_states[k] = "swap"

                add_step(
                    SortingEvents.MERGE,
                    [HighlightedEntity(id = k, state = "swap", label = str(winner))],
                    f"Write {winner} to arr[{k}].",
                    swapping = [k],
                )

                element_states[k] = "visited"
                k += 1


            while i < len(left_half):
                write_val = left_half[i]
                arr[k] = write_val
                metrics["writes"] += 1
                metrics["array_accesses"] += 1
                element_states[k] = "swap"

                add_step(
                    SortingEvents.MERGE,
                    [HighlightedEntity(id = k, state = "swap", label = str(write_val))],
                    f"Copy remaining left value {write_val} to arr[{k}].",
                    swapping = [k],
                )

                element_states[k] = "visited"
                i += 1
                k += 1


            while j < len(right_half):
                write_val = right_half[j]
                arr[k] = write_val
                metrics["writes"] += 1
                metrics["array_accesses"] += 1
                element_states[k] = "swap"

                add_step(
                    SortingEvents.MERGE,
                    [HighlightedEntity(id = k, state = "swap", label = str(write_val))],
                    f"Copy remaining right value {write_val} to arr[{k}].",
                    swapping = [k],
                )

                element_states[k] = "visited"
                j += 1
                k += 1


            for k in range(low, high + 1):
                element_states[k] = "visited"

            merged_values = []
            for k in range(low, high + 1):
                merged_values.append(str(arr[k]))
            merged_vals = ", ".join(merged_values)

            highlighted_entities = [HighlightedEntity(id = list(range(low, high + 1)), state = "visited")]
            message = (
                f"Merge complete [{low}..{high}]: [{merged_vals}]. "
                f"{high - low + 1} elements sorted in this range."
            )
            add_step(SortingEvents.PARTITION_END, highlighted_entities, message)



        mergesort(0, n - 1, 0)


        # COMPLETE
        for k in range(n):
            element_states[k] = "success"

        sorted_values = []
        for x in arr:
            sorted_values.append(str(x))
        sorted_vals = ", ".join(sorted_values)

        add_step(
            SortingEvents.COMPLETE,
            [HighlightedEntity(id = list(range(n)), state = "success")],
            f"Merge Sort complete! Sorted: [{sorted_vals}]. "
            f"{metrics['comparisons']} comparisons, {metrics['writes']} writes, "
            f"max depth {metrics['max_recursion_depth']}.",
        )


        # return
        final_result = {
            "sorted_array": list(arr),
            "comparisons": metrics["comparisons"],
            "writes": metrics["writes"],
            "max_recursion_depth": metrics["max_recursion_depth"],
        }

        alg_metadata = self.build_metadata(algo_input) | {
            "time_complexity": "O(n log n)",
            "space_complexity": "O(n)",
            "stable": True,
            "array_size": n,
        }

        return AlgorithmOutput(
            timeline_steps = steps,
            final_result = final_result,
            summary_metrics = metrics,
            algorithm_metadata = alg_metadata,
        )
