import time

from pydantic import ValidationError

from app.simulation.contract import BaseAlgorithm
from app.simulation.registry import register
from app.simulation.types import AlgorithmInput, AlgorithmOutput
from app.schemas.timeline import TimelineStep, HighlightedEntity
from app.schemas.payloads import CoinChangeInputPayload, DPEvents
from app.simulation.explanation_builder import ExplanationBuilder
from app.exceptions import DomainError


INFINITY = float("inf")


@register("dp", "coin_change")
class CoinChangeAlgorithm(BaseAlgorithm):
    @property
    def module_type(self) -> str:
        return "dp"

    @property
    def algorithm_key(self) -> str:
        return "coin_change"

    def run(self, algo_input: AlgorithmInput) -> AlgorithmOutput:
        eb = ExplanationBuilder(algo_input.explanation_level)

        try:
            dp_input = CoinChangeInputPayload.model_validate(algo_input.input_payload)
        except ValidationError as e:
            raise DomainError("Invalid coin_change input.", details = {"errors": e.errors()})

        coins = sorted(dp_input.coins)
        target = dp_input.target
        size = target + 1

        # 1D DP array: dp[i] = min coins to make amount i
        array = [None] * size
        cell_states = ["default"] * size
        coin_used = [None] * size  # tracks which coin was used at each position

        steps: list[TimelineStep] = []
        metrics = {
            "cells_computed": 0,
            "array_length": size,
            "min_coins": None,
            "coins_used_list": [],
            "subproblems_reused": 0,
            "runtime_ms": 0,
        }

        def add_step(event_type, highlighted, explanation, current_index = None, dependency_indices = None, traceback_path = None, pseudocode_lines: list[int] | None = None):
            s_payload = {
                "array": list(array),
                "cell_states": list(cell_states),
                "current_index": current_index,
                "dependency_indices": list(dependency_indices) if dependency_indices else [],
                "coins_used": list(coin_used),
                "traceback_path": list(traceback_path) if traceback_path else [],
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

        # INITIALIZE — base case dp[0] = 0
        array[0] = 0
        cell_states[0] = "visited"

        coins_str = ", ".join(str(c) for c in coins)
        add_step(
            DPEvents.INITIALIZE,
            [HighlightedEntity(id = 0, state = "visited", label = "0")],
            eb.build(
                title = f"Initialize Coin Change (target={target})",
                body = f"Coins: [{coins_str}]. dp[0] = 0. Zero coins needed for amount 0.",
                data_snapshot = {"table": list(array), "amount": 0, "cell_value": 0, "coins_available": coins},
            ),
            pseudocode_lines = [0, 1, 2],
        )

        # FILL ARRAY
        t_start = time.perf_counter()

        for i in range(1, size):
            cell_states[i] = "active"

            add_step(
                DPEvents.COMPUTE_CELL,
                [HighlightedEntity(id = i, state = "active", label = str(i))],
                eb.build(
                    title = f"Compute dp[{i}]",
                    body = f"Minimum coins to make amount {i}.",
                    data_snapshot = {"amount": i, "cell_value": None, "coins_available": coins},
                ),
                current_index = i,
                pseudocode_lines = [3, 4],
            )

            best = INFINITY
            best_coin = None
            dep_indices = []

            for c in coins:
                if c <= i and array[i - c] is not None:
                    dep_indices.append(i - c)
                    candidate = array[i - c] + 1
                    metrics["subproblems_reused"] += 1

                    if candidate < best:
                        best = candidate
                        best_coin = c

            if dep_indices:
                dep_labels = [
                    HighlightedEntity(id = i, state = "active", label = str(i))
                ]
                for d in dep_indices:
                    dep_labels.append(
                        HighlightedEntity(id = d, state = "frontier", label = str(array[d]))
                    )
                    cell_states[d] = "frontier"

                dep_str = ", ".join(f"dp[{d}]={array[d]}" for d in dep_indices)
                add_step(
                    DPEvents.READ_DEPENDENCY,
                    dep_labels,
                    eb.build(
                        title = f"Check coins for amount {i}",
                        body = f"Dependencies: {dep_str}.",
                        data_snapshot = {"amount": i, "coins_available": coins},
                    ),
                    current_index = i,
                    dependency_indices = dep_indices,
                    pseudocode_lines = [4, 5],
                )

                for d in dep_indices:
                    cell_states[d] = "visited"

            if best < INFINITY:
                array[i] = best
                coin_used[i] = best_coin
                cell_states[i] = "visited"
                metrics["cells_computed"] += 1

                add_step(
                    DPEvents.FILL_CELL,
                    [HighlightedEntity(id = i, state = "visited", label = str(best))],
                    eb.build(
                        title = f"dp[{i}] = {best}",
                        body = f"Using coin {best_coin}. {best} coins needed for amount {i}.",
                        data_snapshot = {"table": list(array), "amount": i, "cell_value": best, "coin_used": best_coin, "coins_available": coins},
                    ),
                    current_index = i,
                    pseudocode_lines = [5],
                )
            else:
                array[i] = None
                cell_states[i] = "visited"
                metrics["cells_computed"] += 1

                add_step(
                    DPEvents.FILL_CELL,
                    [HighlightedEntity(id = i, state = "visited", label = "INF")],
                    eb.build(
                        title = f"dp[{i}] = INF",
                        body = f"No coin combination reaches amount {i}.",
                        data_snapshot = {"table": list(array), "amount": i, "cell_value": None, "coins_available": coins},
                    ),
                    current_index = i,
                    pseudocode_lines = [5],
                )

        t_end = time.perf_counter()
        metrics["runtime_ms"] = round((t_end - t_start) * 1000, 3)

        # TRACEBACK — reconstruct coins used
        coins_list = []
        tb_path = []

        if array[target] is not None:
            cell_states[target] = "source"
            add_step(
                DPEvents.TRACEBACK_START,
                [HighlightedEntity(id = target, state = "source", label = str(array[target]))],
                eb.build(
                    title = f"Begin traceback from dp[{target}]",
                    body = f"Minimum coins = {array[target]}. Tracing back to find coins used.",
                    data_snapshot = {"amount": target, "cell_value": array[target]},
                ),
                current_index = target,
                pseudocode_lines = [7],
            )

            pos = target
            while pos > 0:
                c = coin_used[pos]
                coins_list.append(c)
                tb_path.append(pos)
                cell_states[pos] = "success"

                add_step(
                    DPEvents.TRACEBACK_STEP,
                    [HighlightedEntity(id = pos, state = "success", label = str(c))],
                    eb.build(
                        title = f"Traceback: use coin {c} at dp[{pos}]",
                        body = f"Used coin {c}. Move to dp[{pos - c}].",
                        data_snapshot = {"amount": pos, "coin_used": c, "cell_value": array[pos]},
                    ),
                    current_index = pos,
                    traceback_path = list(tb_path),
                    pseudocode_lines = [7],
                )

                pos -= c

            coins_list.reverse()
            metrics["min_coins"] = array[target]
            metrics["coins_used_list"] = coins_list
        else:
            metrics["min_coins"] = None
            metrics["coins_used_list"] = []

        # COMPLETE
        if array[target] is not None:
            coins_desc = " + ".join(str(c) for c in coins_list)
            complete_explanation = eb.build(
                title = "Coin Change complete",
                body = f"Minimum coins for {target} = {array[target]}. Coins: {coins_desc}. {metrics['cells_computed']} cells computed.",
                data_snapshot = {"table": list(array), "amount": target, "cell_value": array[target], "coins_available": coins},
            )
        else:
            complete_explanation = eb.build(
                title = "Coin Change complete",
                body = f"No solution exists for target {target} with coins [{coins_str}]. {metrics['cells_computed']} cells computed.",
                data_snapshot = {"table": list(array), "amount": target, "cell_value": None, "coins_available": coins},
            )

        add_step(
            DPEvents.COMPLETE,
            [HighlightedEntity(id = target, state = "success" if array[target] is not None else "target", label = str(array[target]))],
            complete_explanation,
            traceback_path = list(tb_path),
            pseudocode_lines = [6, 7] if array[target] is None else [7],
        )

        final_result = {
            "min_coins": array[target],
            "target": target,
            "coins_used_list": coins_list,
            "array_length": size,
        }

        alg_metadata = self.build_metadata(algo_input) | {
            "time_complexity": "O(target x coins)",
            "space_complexity": "O(target)",
            "num_coins": len(coins),
            "target": target,
        }

        return AlgorithmOutput(
            timeline_steps = steps,
            final_result = final_result,
            summary_metrics = metrics,
            algorithm_metadata = alg_metadata,
        )
