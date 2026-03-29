import time

from pydantic import ValidationError

from app.simulation.contract import BaseAlgorithm
from app.simulation.registry import register
from app.simulation.types import AlgorithmInput, AlgorithmOutput
from app.schemas.timeline import TimelineStep, HighlightedEntity
from app.schemas.payloads import SortingInputPayload, SortingEvents
from app.simulation.explanation_builder import ExplanationBuilder
from app.exceptions import DomainError


@register("sorting", "insertion_sort")
class InsertionSortAlgorithm(BaseAlgorithm):
    @property
    def module_type(self) -> str:
        return "sorting"

    @property
    def algorithm_key(self) -> str:
        return "insertion_sort"


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
            "shifts": 0,
            "writes": 0,
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
        # first element is trivially sorted
        element_states[0] = "success"
        highlighted_entities = [HighlightedEntity(id = list(range(n)), state = "default")]
        add_step(
            SortingEvents.INITIALIZE,
            highlighted_entities,
            eb.build(
                title = "Initialize Insertion Sort",
                body = f"Begin Insertion Sort on {n} elements. Build sorted portion from left.",
                data_snapshot = {"array": list(arr), "comparisons": 0, "shifts": 0, "key_value": None, "key_index": None, "insert_position": None},
            ),
            sorted_boundary = 0,
            pseudocode_lines = [0],
        )


        # run the sort
        t_start = time.perf_counter()

        for i in range(1, n):
            key = arr[i]
            metrics["array_accesses"] += 1

            # mark current element as active
            element_states[i] = "active"
            add_step(
                SortingEvents.COMPARE,
                [HighlightedEntity(id = i, state = "active", label = str(key))],
                eb.build(
                    title = f"Pick key arr[{i}] = {key}",
                    body = f"Scan left to find insertion point for key {key}.",
                    data_snapshot = {"array": list(arr), "comparisons": metrics["comparisons"], "shifts": metrics["shifts"], "key_value": key, "key_index": i, "insert_position": None},
                ),
                comparing = [i],
                sorted_boundary = i - 1,
                pseudocode_lines = [1, 2, 3],
            )

            j = i - 1

            # scan backward while arr[j] > key
            while j >= 0:
                metrics["comparisons"] += 1
                metrics["array_accesses"] += 1

                if arr[j] > key:
                    # mark element being shifted
                    element_states[j] = "swap"
                    add_step(
                        SortingEvents.COMPARE,
                        [
                            HighlightedEntity(id = j, state = "swap", label = str(arr[j])),
                            HighlightedEntity(id = j + 1, state = "active", label = str(key)),
                        ],
                        eb.build(
                            title = f"Shift arr[{j}] right",
                            body = f"arr[{j}] = {arr[j]} > key {key}. Shift right to arr[{j + 1}].",
                            data_snapshot = {"array": list(arr), "comparisons": metrics["comparisons"], "shifts": metrics["shifts"], "key_value": key, "key_index": i, "insert_position": None},
                        ),
                        comparing = [j, j + 1],
                        sorted_boundary = i - 1,
                        pseudocode_lines = [4, 5, 6],
                    )

                    # shift element right
                    arr[j + 1] = arr[j]
                    metrics["shifts"] += 1
                    metrics["writes"] += 1
                    metrics["array_accesses"] += 1

                    element_states[j + 1] = "swap"
                    element_states[j] = "active"

                    j -= 1

                else:
                    # arr[j] <= key — insertion point found
                    add_step(
                        SortingEvents.COMPARE,
                        [
                            HighlightedEntity(id = j, state = "frontier", label = str(arr[j])),
                            HighlightedEntity(id = j + 1, state = "active", label = str(key)),
                        ],
                        eb.build(
                            title = f"Insertion point found at {j + 1}",
                            body = f"arr[{j}] = {arr[j]} <= key {key}. Insert at index {j + 1}.",
                            data_snapshot = {"array": list(arr), "comparisons": metrics["comparisons"], "shifts": metrics["shifts"], "key_value": key, "key_index": i, "insert_position": j + 1},
                        ),
                        comparing = [j, j + 1],
                        sorted_boundary = i - 1,
                        pseudocode_lines = [4],
                    )
                    break

            # when j < 0, key is smaller than all elements — insertion point is 0
            if j < 0:
                add_step(
                    SortingEvents.COMPARE,
                    [HighlightedEntity(id = 0, state = "active", label = str(key))],
                    eb.build(
                        title = "Insert at index 0",
                        body = f"Key {key} is smaller than all elements. Insertion point is index 0.",
                        data_snapshot = {"array": list(arr), "comparisons": metrics["comparisons"], "shifts": metrics["shifts"], "key_value": key, "key_index": i, "insert_position": 0},
                    ),
                    sorted_boundary = i - 1,
                    pseudocode_lines = [4],
                )

            # place key at insertion point
            arr[j + 1] = key
            metrics["writes"] += 1
            metrics["array_accesses"] += 1

            element_states[j + 1] = "source"
            add_step(
                SortingEvents.INSERT,
                [HighlightedEntity(id = j + 1, state = "source", label = str(key))],
                eb.build(
                    title = f"Insert {key} at arr[{j + 1}]",
                    body = f"Place key {key} at index {j + 1}. {metrics['shifts']} shifts so far.",
                    data_snapshot = {"array": list(arr), "comparisons": metrics["comparisons"], "shifts": metrics["shifts"], "key_value": key, "key_index": i, "insert_position": j + 1},
                ),
                sorted_boundary = i,
                pseudocode_lines = [7],
            )

            # mark sorted portion [0..i] as success
            for k in range(i + 1):
                element_states[k] = "success"

            add_step(
                SortingEvents.MARK_SORTED,
                [HighlightedEntity(id = list(range(i + 1)), state = "success")],
                eb.build(
                    title = f"Sorted portion [0..{i}]",
                    body = f"Sorted portion is now arr[0..{i}]. {metrics['comparisons']} comparisons, {metrics['shifts']} shifts.",
                    data_snapshot = {"array": list(arr), "comparisons": metrics["comparisons"], "shifts": metrics["shifts"], "key_value": key, "key_index": i, "insert_position": j + 1},
                ),
                sorted_boundary = i,
                pseudocode_lines = [1],
            )

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
                title = "Insertion Sort complete",
                body = f"{metrics['comparisons']} comparisons, {metrics['shifts']} shifts, {metrics['writes']} writes.",
                data_snapshot = {"array": list(arr), "comparisons": metrics["comparisons"], "shifts": metrics["shifts"], "key_value": None, "key_index": None, "insert_position": None},
            ),
            sorted_boundary = n - 1,
            pseudocode_lines = [8],
        )


        # return
        final_result = {
            "sorted_array": list(arr),
            "comparisons": metrics["comparisons"],
            "shifts": metrics["shifts"],
            "writes": metrics["writes"],
        }

        alg_metadata = self.build_metadata(algo_input) | {
            "time_complexity": "O(n²) average/worst, O(n) best",
            "space_complexity": "O(1)",
            "stable": True,
            "adaptive": True,
            "array_size": n,
        }

        return AlgorithmOutput(
            timeline_steps = steps,
            final_result = final_result,
            summary_metrics = metrics,
            algorithm_metadata = alg_metadata,
        )
