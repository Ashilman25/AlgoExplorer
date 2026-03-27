import time

from pydantic import ValidationError

from app.simulation.contract import BaseAlgorithm
from app.simulation.registry import register
from app.simulation.types import AlgorithmInput, AlgorithmOutput
from app.schemas.timeline import TimelineStep, HighlightedEntity
from app.schemas.payloads import SortingInputPayload, SearchingEvents
from app.exceptions import DomainError


@register("sorting", "linear_search")
class LinearSearchAlgorithm(BaseAlgorithm):
    @property
    def module_type(self) -> str:
        return "sorting"

    @property
    def algorithm_key(self) -> str:
        return "linear_search"


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
        target = sorting_input.target

        # simulation state
        element_states = ["default"] * n
        steps: list[TimelineStep] = []
        metrics = {
            "comparisons": 0,
            "array_accesses": 0,
            "array_length": n,
        }


        def add_step(event_type, highlighted, explanation, search_low = None, search_mid = None, search_high = None, found_index = None):
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
            f"Initialize Linear Search on {n} elements. "
            f"Searching for target = {target}."
        )
        add_step(SearchingEvents.INITIALIZE, highlighted_entities, message)


        # run the search
        t_start = time.perf_counter()
        found_idx = None

        for i in range(n):
            metrics["array_accesses"] += 1
            metrics["comparisons"] += 1
            element_states[i] = "active"

            add_step(
                SearchingEvents.SCAN,
                [HighlightedEntity(id = i, state = "active", label = str(arr[i]))],
                f"Check arr[{i}] = {arr[i]}. Target = {target}.",
            )

            if arr[i] == target:
                element_states[i] = "success"
                found_idx = i

                add_step(
                    SearchingEvents.FOUND,
                    [HighlightedEntity(id = i, state = "success", label = str(arr[i]))],
                    f"Found target {target} at index {i}!",
                    found_index = i,
                )
                break
            else:
                element_states[i] = "visited"

        t_end = time.perf_counter()
        metrics["runtime_ms"] = round((t_end - t_start) * 1000, 3)

        if found_idx is None:
            add_step(
                SearchingEvents.NOT_FOUND,
                [HighlightedEntity(id = list(range(n)), state = "visited")],
                f"Target {target} not found in the array after {metrics['comparisons']} comparisons.",
            )


        # COMPLETE
        add_step(
            SearchingEvents.COMPLETE,
            [HighlightedEntity(id = list(range(n)), state = "success" if found_idx is not None else "visited")],
            f"Linear Search complete. "
            + (f"Target {target} found at index {found_idx}." if found_idx is not None else f"Target {target} not found.")
            + f" {metrics['comparisons']} comparisons.",
            found_index = found_idx,
        )


        # return
        final_result = {
            "found": found_idx is not None,
            "found_index": found_idx,
            "target": target,
            "comparisons": metrics["comparisons"],
        }

        alg_metadata = self.build_metadata(algo_input) | {
            "time_complexity": "O(n) average/worst, O(1) best",
            "space_complexity": "O(1)",
            "requires_sorted": False,
            "array_size": n,
        }

        return AlgorithmOutput(
            timeline_steps = steps,
            final_result = final_result,
            summary_metrics = metrics,
            algorithm_metadata = alg_metadata,
        )
