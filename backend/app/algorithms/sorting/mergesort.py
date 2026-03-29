import time

from pydantic import ValidationError

from app.simulation.contract import BaseAlgorithm
from app.simulation.registry import register
from app.simulation.types import AlgorithmInput, AlgorithmOutput
from app.schemas.timeline import TimelineStep, HighlightedEntity
from app.schemas.payloads import SortingInputPayload, SortingEvents
from app.simulation.explanation_builder import ExplanationBuilder
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
        eb = ExplanationBuilder(algo_input.explanation_level)
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
                title = "Initialize Merge Sort",
                body = f"Begin Merge Sort on {n} elements. Top-down divide-and-conquer approach.",
                data_snapshot = {"array": list(arr), "comparisons": 0, "writes": 0, "range": [0, n - 1], "depth": 0},
            ),
            pseudocode_lines = [0],
        )


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
                    eb.build(
                        title = f"Mark arr[{low}] sorted",
                        body = f"Single element arr[{low}] = {arr[low]} is trivially sorted.",
                        data_snapshot = {"array": list(arr), "comparisons": metrics["comparisons"], "writes": metrics["writes"], "range": [low, low], "depth": depth},
                    ),
                    pseudocode_lines = [1],
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
            add_step(
                SortingEvents.PARTITION_START,
                highlighted_entities,
                eb.build(
                    title = f"Split [{low}..{high}]",
                    body = f"Divide into {left_range} and {right_range} at depth {depth}.",
                    data_snapshot = {"array": list(arr), "comparisons": metrics["comparisons"], "writes": metrics["writes"], "range": [low, high], "depth": depth},
                ),
                pseudocode_lines = [2, 3, 4],
            )

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
                    compare_body = f"Left {left_val} <= right {right_val}. Take {left_val} from left half."
                    i += 1
                else:
                    winner = right_val
                    compare_body = f"Left {left_val} > right {right_val}. Take {right_val} from right half."
                    j += 1

                highlighted_entities = [
                    HighlightedEntity(id = left_idx, state = "frontier", label = str(left_val)),
                    HighlightedEntity(id = right_idx, state = "frontier", label = str(right_val)),
                ]
                add_step(
                    SortingEvents.COMPARE,
                    highlighted_entities,
                    eb.build(
                        title = f"Compare left[{left_idx}] and right[{right_idx}]",
                        body = compare_body,
                        data_snapshot = {"array": list(arr), "comparisons": metrics["comparisons"], "writes": metrics["writes"], "range": [low, high], "depth": depth, "left_value": left_val, "right_value": right_val},
                    ),
                    comparing = [left_idx, right_idx],
                    pseudocode_lines = [10, 11],
                )


                # MERGE
                arr[k] = winner
                metrics["writes"] += 1
                metrics["array_accesses"] += 1
                element_states[k] = "swap"

                add_step(
                    SortingEvents.MERGE,
                    [HighlightedEntity(id = k, state = "swap", label = str(winner))],
                    eb.build(
                        title = f"Write {winner} to arr[{k}]",
                        body = f"Place {winner} at position {k}. {metrics['writes']} writes so far.",
                        data_snapshot = {"array": list(arr), "comparisons": metrics["comparisons"], "writes": metrics["writes"], "range": [low, high], "depth": depth},
                    ),
                    swapping = [k],
                    pseudocode_lines = [11],
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
                    eb.build(
                        title = f"Copy left {write_val} to arr[{k}]",
                        body = f"Copy remaining left value {write_val} to position {k}. {metrics['writes']} writes so far.",
                        data_snapshot = {"array": list(arr), "comparisons": metrics["comparisons"], "writes": metrics["writes"], "range": [low, high], "depth": depth},
                    ),
                    swapping = [k],
                    pseudocode_lines = [12],
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
                    eb.build(
                        title = f"Copy right {write_val} to arr[{k}]",
                        body = f"Copy remaining right value {write_val} to position {k}. {metrics['writes']} writes so far.",
                        data_snapshot = {"array": list(arr), "comparisons": metrics["comparisons"], "writes": metrics["writes"], "range": [low, high], "depth": depth},
                    ),
                    swapping = [k],
                    pseudocode_lines = [13],
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
            add_step(
                SortingEvents.PARTITION_END,
                highlighted_entities,
                eb.build(
                    title = f"Merge complete [{low}..{high}]",
                    body = f"{high - low + 1} elements sorted in this range.",
                    data_snapshot = {"array": list(arr), "comparisons": metrics["comparisons"], "writes": metrics["writes"], "range": [low, high], "depth": depth, "merged_values": [arr[k] for k in range(low, high + 1)]},
                ),
                pseudocode_lines = [5, 7],
            )



        t_start = time.perf_counter()
        mergesort(0, n - 1, 0)
        t_end = time.perf_counter()
        metrics["runtime_ms"] = round((t_end - t_start) * 1000, 3)


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
            eb.build(
                title = "Merge Sort complete",
                body = f"{metrics['comparisons']} comparisons, {metrics['writes']} writes, max depth {metrics['max_recursion_depth']}.",
                data_snapshot = {"array": list(arr), "comparisons": metrics["comparisons"], "writes": metrics["writes"], "range": [0, n - 1], "depth": 0},
            ),
            pseudocode_lines = [0],
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
