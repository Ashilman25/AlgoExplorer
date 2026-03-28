import time

from pydantic import ValidationError

from app.simulation.contract import BaseAlgorithm
from app.simulation.registry import register
from app.simulation.types import AlgorithmInput, AlgorithmOutput
from app.schemas.timeline import TimelineStep, HighlightedEntity
from app.schemas.payloads import FibonacciInputPayload, DPEvents
from app.exceptions import DomainError


# Maximum n per mode to prevent combinatorial explosion
MODE_CAPS = {
    "tabulation": 50,
    "memoized": 40,
    "naive_recursive": 15,
}


@register("dp", "fibonacci")
class FibonacciAlgorithm(BaseAlgorithm):
    @property
    def module_type(self) -> str:
        return "dp"

    @property
    def algorithm_key(self) -> str:
        return "fibonacci"

    def run(self, algo_input: AlgorithmInput) -> AlgorithmOutput:
        try:
            dp_input = FibonacciInputPayload.model_validate(algo_input.input_payload)
        except ValidationError as e:
            raise DomainError("Invalid fibonacci input.", details = {"errors": e.errors()})

        mode = algo_input.algorithm_config.get("mode", "tabulation")
        if mode not in MODE_CAPS:
            raise DomainError(
                f"Unknown Fibonacci mode '{mode}'. "
                f"Valid modes: {', '.join(MODE_CAPS.keys())}."
            )

        n = dp_input.n
        cap = MODE_CAPS[mode]
        if n > cap:
            raise DomainError(
                f"n={n} exceeds maximum of {cap} for {mode} mode."
            )

        if mode == "tabulation":
            return self._run_tabulation(n, algo_input)
        elif mode == "memoized":
            return self._run_memoized(n, algo_input)
        else:
            return self._run_naive(n, algo_input)

    # Mode 1 — Tabulation (bottom-up, 1D array)                          
    def _run_tabulation(self, n: int, algo_input: AlgorithmInput) -> AlgorithmOutput:
        explain = algo_input.explanation_level

        # Array indices 1..n (index 0 unused; we use 1-based Fibonacci)
        array = [None] * (n + 1)
        cell_states = ["default"] * (n + 1)

        steps: list[TimelineStep] = []
        metrics = {
            "fib_result": None,
            "fib_n": n,
            "total_calls": 0,
            "redundant_calls": 0,
            "max_depth": 0,
            "runtime_ms": 0,
        }

        def add_step(event_type, highlighted, explanation, current_index = None, dependency_indices = None):
            s_payload = {
                "array": list(array),
                "cell_states": list(cell_states),
                "current_index": current_index,
                "dependency_indices": list(dependency_indices) if dependency_indices else [],
                "call_tree": None,
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

        # Base cases
        array[1] = 1
        cell_states[1] = "visited"
        if n >= 2:
            array[2] = 1
            cell_states[2] = "visited"

        add_step(
            DPEvents.INITIALIZE,
            [
                HighlightedEntity(id = 1, state = "visited", label = "F(1)=1"),
            ] + (
                [HighlightedEntity(id = 2, state = "visited", label = "F(2)=1")]
                if n >= 2 else []
            ),
            f"Initialize Fibonacci tabulation (n={n}). "
            f"Base cases: F(1) = 1" + (", F(2) = 1." if n >= 2 else "."),
        )

        if n <= 2:
            metrics["fib_result"] = array[n]
            metrics["total_calls"] = 0
            add_step(
                DPEvents.COMPLETE,
                [HighlightedEntity(id = n, state = "success", label = f"F({n})={array[n]}")],
                f"Fibonacci({n}) = {array[n]} (base case).",
            )
            final_result = {
                "fib_result": array[n],
                "fib_n": n,
                "mode": "tabulation",
            }
            alg_metadata = self.build_metadata(algo_input) | {
                "time_complexity": "O(n)",
                "space_complexity": "O(n)",
                "mode": "tabulation",
            }
            return AlgorithmOutput(
                timeline_steps = steps,
                final_result = final_result,
                summary_metrics = metrics,
                algorithm_metadata = alg_metadata,
            )

        t_start = time.perf_counter()

        for i in range(3, n + 1):
            cell_states[i] = "active"
            metrics["total_calls"] += 1

            add_step(
                DPEvents.COMPUTE_CELL,
                [HighlightedEntity(id = i, state = "active", label = f"F({i})")],
                f"Computing F({i}) = F({i - 1}) + F({i - 2}).",
                current_index = i,
            )

            dep_indices = [i - 1, i - 2]
            for d in dep_indices:
                cell_states[d] = "frontier"

            add_step(
                DPEvents.READ_DEPENDENCY,
                [
                    HighlightedEntity(id = i, state = "active", label = f"F({i})"),
                    HighlightedEntity(id = i - 1, state = "frontier", label = f"F({i - 1})={array[i - 1]}"),
                    HighlightedEntity(id = i - 2, state = "frontier", label = f"F({i - 2})={array[i - 2]}"),
                ],
                f"F({i}) reads F({i - 1}) = {array[i - 1]} and F({i - 2}) = {array[i - 2]}.",
                current_index = i,
                dependency_indices = dep_indices,
            )

            for d in dep_indices:
                cell_states[d] = "visited"

            array[i] = array[i - 1] + array[i - 2]
            cell_states[i] = "visited"

            add_step(
                DPEvents.FILL_CELL,
                [HighlightedEntity(id = i, state = "visited", label = f"F({i})={array[i]}")],
                f"F({i}) = {array[i - 1]} + {array[i - 2]} = {array[i]}.",
                current_index = i,
            )

        t_end = time.perf_counter()
        metrics["runtime_ms"] = round((t_end - t_start) * 1000, 3)
        metrics["fib_result"] = array[n]

        add_step(
            DPEvents.COMPLETE,
            [HighlightedEntity(id = n, state = "success", label = f"F({n})={array[n]}")],
            f"Fibonacci tabulation complete! F({n}) = {array[n]}. "
            f"{metrics['total_calls']} cells computed after base cases.",
        )

        final_result = {
            "fib_result": array[n],
            "fib_n": n,
            "mode": "tabulation",
        }

        alg_metadata = self.build_metadata(algo_input) | {
            "time_complexity": "O(n)",
            "space_complexity": "O(n)",
            "mode": "tabulation",
        }

        return AlgorithmOutput(
            timeline_steps = steps,
            final_result = final_result,
            summary_metrics = metrics,
            algorithm_metadata = alg_metadata,
        )


    # Mode 2 — Memoized (top-down recursion with memo table)             
    def _run_memoized(self, n: int, algo_input: AlgorithmInput) -> AlgorithmOutput:
        explain = algo_input.explanation_level

        # array: index 1..n; None = not yet computed
        array = [None] * (n + 1)
        cell_states = ["default"] * (n + 1)
        memo: dict[int, int] = {}

        steps: list[TimelineStep] = []
        metrics = {
            "fib_result": None,
            "fib_n": n,
            "total_calls": 0,
            "redundant_calls": 0,
            "max_depth": 0,
            "runtime_ms": 0,
        }

        # Call tree: list of node dicts
        call_tree_nodes: list[dict] = []
        # node_counter for unique IDs
        _node_id_counter = [0]

        def new_node_id() -> int:
            _node_id_counter[0] += 1
            return _node_id_counter[0]

        def add_step(event_type, highlighted, explanation, current_index = None, dependency_indices = None):
            s_payload = {
                "array": list(array),
                "cell_states": list(cell_states),
                "current_index": current_index,
                "dependency_indices": list(dependency_indices) if dependency_indices else [],
                "call_tree": {
                    "nodes": [dict(nd) for nd in call_tree_nodes],
                },
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

        add_step(
            DPEvents.INITIALIZE,
            [HighlightedEntity(id = n, state = "active", label = f"F({n})")],
            f"Initialize Fibonacci memoized (n={n}). "
            f"Top-down recursion with memo table. Each sub-problem computed at most once.",
        )

        t_start = time.perf_counter()

        def fib_memo(k: int, parent_id: int | None, depth: int) -> int:
            metrics["total_calls"] += 1
            if depth > metrics["max_depth"]:
                metrics["max_depth"] = depth

            node_id = new_node_id()
            call_tree_nodes.append({
                "id": node_id,
                "n": k,
                "parent_id": parent_id,
                "depth": depth,
                "state": "active",
                "result": None,
            })

            cell_states[k] = "active"

            add_step(
                DPEvents.COMPUTE_CELL,
                [HighlightedEntity(id = k, state = "active", label = f"F({k})")],
                f"Call F({k}) at depth {depth}.",
                current_index = k,
            )

            if k in memo:
                # Memo hit — no redundant work since we cached it
                result = memo[k]
                for nd in call_tree_nodes:
                    if nd["id"] == node_id:
                        nd["state"] = "source"
                        nd["result"] = result
                        break
                cell_states[k] = "source"

                add_step(
                    DPEvents.FILL_CELL,
                    [HighlightedEntity(id = k, state = "source", label = f"F({k})={result} (memo)")],
                    f"F({k}) = {result} (memo hit — already computed).",
                    current_index = k,
                )
                return result

            if k <= 2:
                result = 1
                memo[k] = result
                array[k] = result
                cell_states[k] = "visited"
                for nd in call_tree_nodes:
                    if nd["id"] == node_id:
                        nd["state"] = "visited"
                        nd["result"] = result
                        break

                add_step(
                    DPEvents.FILL_CELL,
                    [HighlightedEntity(id = k, state = "visited", label = f"F({k})={result} (base)")],
                    f"F({k}) = {result} (base case).",
                    current_index = k,
                )
                return result

            # Recurse
            dep_indices = [k - 1, k - 2]
            add_step(
                DPEvents.READ_DEPENDENCY,
                [HighlightedEntity(id = k, state = "active", label = f"F({k})")],
                f"F({k}) will recurse into F({k - 1}) and F({k - 2}).",
                current_index = k,
                dependency_indices = dep_indices,
            )

            left = fib_memo(k - 1, node_id, depth + 1)
            right = fib_memo(k - 2, node_id, depth + 1)
            result = left + right

            memo[k] = result
            array[k] = result
            cell_states[k] = "visited"
            for nd in call_tree_nodes:
                if nd["id"] == node_id:
                    nd["state"] = "visited"
                    nd["result"] = result
                    break

            add_step(
                DPEvents.FILL_CELL,
                [HighlightedEntity(id = k, state = "visited", label = f"F({k})={result}")],
                f"F({k}) = F({k - 1}) + F({k - 2}) = {left} + {right} = {result}. Cached in memo.",
                current_index = k,
            )
            return result

        result = fib_memo(n, None, 0)

        t_end = time.perf_counter()
        metrics["runtime_ms"] = round((t_end - t_start) * 1000, 3)
        metrics["fib_result"] = result

        add_step(
            DPEvents.COMPLETE,
            [HighlightedEntity(id = n, state = "success", label = f"F({n})={result}")],
            f"Fibonacci memoized complete! F({n}) = {result}. "
            f"{metrics['total_calls']} calls, {metrics['redundant_calls']} redundant (memo prevented recomputation), "
            f"max depth {metrics['max_depth']}.",
        )

        final_result = {
            "fib_result": result,
            "fib_n": n,
            "mode": "memoized",
        }

        alg_metadata = self.build_metadata(algo_input) | {
            "time_complexity": "O(n)",
            "space_complexity": "O(n)",
            "mode": "memoized",
        }

        return AlgorithmOutput(
            timeline_steps = steps,
            final_result = final_result,
            summary_metrics = metrics,
            algorithm_metadata = alg_metadata,
        )

    # Mode 3 — Naive recursive (pure recursion, no memo, exponential)    
    def _run_naive(self, n: int, algo_input: AlgorithmInput) -> AlgorithmOutput:
        explain = algo_input.explanation_level

        steps: list[TimelineStep] = []
        metrics = {
            "fib_result": None,
            "fib_n": n,
            "total_calls": 0,
            "redundant_calls": 0,
            "max_depth": 0,
            "runtime_ms": 0,
        }

        call_tree_nodes: list[dict] = []
        _node_id_counter = [0]
        # Track how many times each F(k) has been fully computed
        _computed: dict[int, int] = {}

        def new_node_id() -> int:
            _node_id_counter[0] += 1
            return _node_id_counter[0]

        def add_step(event_type, highlighted, explanation):
            s_payload = {
                "array": None,
                "cell_states": None,
                "current_index": None,
                "dependency_indices": [],
                "call_tree": {
                    "nodes": [dict(nd) for nd in call_tree_nodes],
                },
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

        add_step(
            DPEvents.INITIALIZE,
            [HighlightedEntity(id = 0, state = "active", label = f"F({n})")],
            f"Initialize Fibonacci naive recursive (n={n}). "
            f"No memoization — every sub-problem recomputed from scratch. "
            f"Exponential time complexity O(2^n).",
        )

        t_start = time.perf_counter()

        def fib_naive(k: int, parent_id: int | None, depth: int) -> int:
            metrics["total_calls"] += 1
            if depth > metrics["max_depth"]:
                metrics["max_depth"] = depth

            node_id = new_node_id()
            call_tree_nodes.append({
                "id": node_id,
                "n": k,
                "parent_id": parent_id,
                "depth": depth,
                "state": "active",
                "result": None,
            })

            # Count redundant calls: any repeated invocation of the same F(k)
            # beyond the first one
            if k in _computed:
                metrics["redundant_calls"] += 1

            add_step(
                DPEvents.COMPUTE_CELL,
                [HighlightedEntity(id = node_id, state = "active", label = f"F({k})")],
                f"Call F({k}) at depth {depth}" + (
                    f" (REDUNDANT — F({k}) already computed {_computed[k]} time(s))."
                    if k in _computed else "."
                ),
            )

            if k <= 2:
                result = 1
                _computed[k] = _computed.get(k, 0) + 1

                for nd in call_tree_nodes:
                    if nd["id"] == node_id:
                        nd["state"] = "visited"
                        nd["result"] = result
                        break

                add_step(
                    DPEvents.FILL_CELL,
                    [HighlightedEntity(id = node_id, state = "visited", label = f"F({k})={result}")],
                    f"F({k}) = {result} (base case).",
                )
                return result

            left = fib_naive(k - 1, node_id, depth + 1)
            right = fib_naive(k - 2, node_id, depth + 1)
            result = left + right
            _computed[k] = _computed.get(k, 0) + 1

            for nd in call_tree_nodes:
                if nd["id"] == node_id:
                    nd["state"] = "visited"
                    nd["result"] = result
                    break

            add_step(
                DPEvents.FILL_CELL,
                [HighlightedEntity(id = node_id, state = "visited", label = f"F({k})={result}")],
                f"F({k}) = F({k - 1}) + F({k - 2}) = {left} + {right} = {result}.",
            )
            return result

        result = fib_naive(n, None, 0)

        t_end = time.perf_counter()
        metrics["runtime_ms"] = round((t_end - t_start) * 1000, 3)
        metrics["fib_result"] = result

        add_step(
            DPEvents.COMPLETE,
            [HighlightedEntity(id = 0, state = "success", label = f"F({n})={result}")],
            f"Fibonacci naive recursive complete! F({n}) = {result}. "
            f"{metrics['total_calls']} total calls, {metrics['redundant_calls']} redundant. "
            f"Max recursion depth: {metrics['max_depth']}.",
        )

        final_result = {
            "fib_result": result,
            "fib_n": n,
            "mode": "naive_recursive",
        }

        alg_metadata = self.build_metadata(algo_input) | {
            "time_complexity": "O(2^n)",
            "space_complexity": "O(n)",
            "mode": "naive_recursive",
        }

        return AlgorithmOutput(
            timeline_steps = steps,
            final_result = final_result,
            summary_metrics = metrics,
            algorithm_metadata = alg_metadata,
        )
